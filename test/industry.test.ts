import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { compareIndustry, industryRows, mergeBrands } from "../src/site-review/industry.ts";
import { siteReview } from "../src/site-review/route.ts";
import { readWorkspace } from "../src/storage/queries.ts";
import { reviewDocument } from "../public/scripts/components/review-export.js";

const identity = { brand: "演示甲", aliases: ["甲平台"], rivals: [], category: "演示排班工具",
  evidence: "演示甲", question: "团队如何选择排班工具？" };
const page = {title: "演示乙排班工具", snippet: "可查看团队班表示例", url: "https://example.org/"};
const modules = [{name: "产品介绍", evidence: "演示甲为团队排班"}];
const row = {name: "演示乙", segment: "同类排班工具", source: 0, quote: "可查看团队班表示例",
  change: {module: 0, priority: "高", gap: "当前介绍只给出用途", action: "在介绍下增加真实班表示例", verify: "能找到班表及字段说明"}};

test("收录官网未点名的同行，拒绝自家别名、无来源名称和伪造引文", async () => {
  const rows = industryRows({rows: [row, row, {...row, source: 1}, {...row, name: "演示丙"},
    {...row, name: "甲平台"}, {...row, name: "工具", quote: "虚构描述"}]}, identity, [page], modules);
  assert.deepEqual(rows.map(r => r.name), ["演示乙"]);
  assert.equal(rows[0].change.evidence, modules[0].evidence);
  assert.equal(industryRows({rows: [{...row, change: {...row.change, module: 9}}]}, identity, [page], modules)[0].change, null);
  assert.deepEqual((await compareIndustry(null, modules, page.url, "test")).rows, []);
});

test("官网分析通过检索与模型生成行业报告，可按域名回读及导出", async (t) => {
  const f = await fixture();
  t.after(() => f.close());
  const actions = ["标题", "说明"].map(target => ({target, instruction: "修改" + target, example: target, verify: target}));
  const overview = {usable: true, identity, impression: "团队排班", modules: [{...modules[0], source: "原文",
    strength: "用途明确", weakness: "介绍较短", impact: "难以判断是否适用", actions}]};
  const calls = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const url = String(input);
    if (url.startsWith("https://api.search.brave.com/")) {
      calls.push(new URL(url).searchParams.get("q"));
      return Response.json({web: {results: [{...page, description: page.snippet}]}});
    }
    assert.ok(url.startsWith("https://dashscope.aliyuncs.com/"));
    const payload = JSON.parse(init.body);
    const output = payload.messages[0].content.includes("行业竞品清单") ? {rows: [row]} : overview;
    return Response.json({id: "fixture", model: "demo", created: 1, choices: [
      { index: 0, finish_reason: "stop", message: {role: "assistant", content: JSON.stringify(output)} },
    ], usage: {prompt_tokens: 1, completion_tokens: 1, total_tokens: 2}});
  });
  const config = {id: "test-site", domain: "example.com", brand: identity.brand};
  await f.pool.query("INSERT INTO monitors(id,config) VALUES(?1,?2)", [config.id, config]);
  const env = { DB: f.binding, DASHSCOPE_API_KEY: "demo", BRAVE_SEARCH_API_KEY: "demo",
    BROWSER: { quickAction: async () => Response.json({success: true, meta: {status: 200, title: "演示甲"},
      result: {markdown: modules[0].evidence, screenshot: "/9j/abcd"}}) },
    WORKSPACE: { idFromName: () => "demo", get: () => ({fetch: async () => Response.json(config)}) },
  };
  const response = await siteReview(new Request("https://app.example.com/api/site-review",
    {method: "POST", body: JSON.stringify({url: "https://www.example.com"})}), env);
  assert.equal(response.status, 200);
  const {report} = await response.json();
  assert.equal(new Set(calls).size, 5);
  assert.equal(report.industry.rows[0].name, "演示乙");
  assert.equal(report.industry.preview.image, "/9j/abcd");
  assert.ok(reviewDocument(report).includes(row.change.action));
  const read = async (id) => {
    const path = "/api/industry/" + id;
    return (await readWorkspace(new Request("https://app.example.com" + path), path, f.pool, env)).json();
  };
  assert.deepEqual((await read(config.id)).industry.rows, report.industry.rows);
  assert.equal((await read("other")).industry, null);
});

test("千问检索复用账号密钥，启用联网并校验候选网址", async t => {
  const {discoverUrls} = await import("../src/site-review/qwen-search.ts");
  t.mock.method(globalThis, "fetch", async (url, init) => {
    assert.equal(String(url), "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions");
    const payload = JSON.parse(init.body);
    assert.ok(payload.enable_search && payload.search_options.forced_search);
    return Response.json({id:"fixture", model:"qwen-plus", created:1, choices:[
      {index:0, finish_reason:"stop", message:{role:"assistant",
        content:"https://example.com\nhttps://example.com\nhttp://127.0.0.1/"}},
    ]});
  });
  assert.deepEqual(await discoverUrls("演示行业", "demo"), ["https://example.com/"]);
});

test("按原文段落引用，扩展检索保留已核实的品牌", () => {
  const incoming = {...row, name: "演示丙", quote: undefined, passage: 1};
  const original = industryRows({rows: [row]}, identity, [page], modules);
  const found = industryRows({rows: [incoming, {...incoming, name: "演示丁", passage: 90}]}, identity,
    [{...page, title: "演示丙与演示丁", snippet: "可以导出班表。"}], modules);
  assert.deepEqual(mergeBrands(original, found).map(r => r.name), ["演示乙", "演示丙"]);
  assert.equal(found[0].quote, "可以导出班表。");
});
