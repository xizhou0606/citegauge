import assert from "node:assert/strict";
import test from "node:test";
import { websiteURL, capture } from "../src/site-review/capture.ts";
import { readReview } from "../src/site-review/analyze.ts";
import { siteReview } from "../src/site-review/route.ts";
import { fixture } from "./d1-fixture.ts";

test("官网输入支持裸域名和深层页面，拒绝凭据、内网与非网页协议", () => {
  assert.equal(websiteURL(" example.com/about#team "), "https://example.com/about");
  for (const url of ["http://127.0.0.1", "http://[::1]", "https://localhost", "https://x.local",
    "ftp://example.com", "https://user:pass@example.com", "https://example.com:8888", ""])
    assert.throws(() => websiteURL(url));
});

test("报告只保留有截图观察或可核对原文的模块", () => {
  const actions = [
    { target: "案例标题", instruction: "补充案例所属行业", example: "零售行业客户故事", verify: "标题可读出行业" },
    { target: "案例入口", instruction: "链接至对应的案例正文", example: "阅读这家客户的案例", verify: "点击进入对应案例" },
  ];
  const module = { actions, name: "产品案例", evidence: "客户故事", source: "原文",
    impact: "品牌团队很难找到同类客户", acceptance: "案例入口旁可见行业标签", strength: "给出了案例入口", weakness: "入口缺少行业说明", change: "在案例标题旁补充行业" };
  const payload = { usable: true, identity: null, impression: "面向品牌团队", modules: [
    module, { ...module, evidence: "一条不存在的引用" },
    { ...module, source: "截图", name: "首屏", evidence: "左侧标题和右侧截图形成对照" },
  ] };
  const found = readReview(JSON.stringify(payload), "## 客户故事").modules;
  assert.equal(found.length, 2);
  assert.deepEqual(found[0].actions, actions);
  const cited = readReview(JSON.stringify({...payload, modules: [
    {...module, evidence: undefined, passage: 2}, {...module, passage: 99},
  ]}), "## 首页\n[客户故事](https://example.com/case)").modules;
  assert.deepEqual(cited.map(m => m.evidence), ["客户故事"]);
  assert.throws(() => readReview(JSON.stringify({ ...payload, usable: false }), ""));
  assert.throws(() => readReview(JSON.stringify({ ...payload, modules: [module] }), ""));
});

test("拒绝上游错误页与不可用截图，保留跳转后的公开网址", async () => {
  const get = (status, image) => ({
    quickAction: async () => Response.json({ success: true, meta: {
      status, title: "例子", finalUrl: "https://www.example.com/",
    }, result: { screenshot: image, markdown: "例子说明" } }),
  });
  assert.equal((await capture(get(200, "/9j/abcd"), "https://example.com")).url, "https://www.example.com/");
  await assert.rejects(capture(get(403, "/9j/abcd"), "https://example.com"), /HTTP 403/);
  await assert.rejects(capture(get(200, ""), "https://example.com"));
});

test("失败的官网分析不会覆盖最近成功报告", async () => {
  const f = await fixture();
  try {
    const endpoint = "https://example.com/api/site-review";
    const env = { DB: f.binding };
    const get = async () => (await siteReview(new Request(endpoint), env)).json();
    assert.equal((await get()).report, null);
    await f.binding.prepare("INSERT INTO website_reports VALUES ('example.com',1,?1)")
      .bind(JSON.stringify({ url: "https://example.com" })).run();
    const result = await siteReview(new Request(endpoint, { method: "POST",
      body: JSON.stringify({ url: "http://127.0.0.1" }) }), env);
    assert.equal(result.status, 400);
    assert.equal((await get()).report.url, "https://example.com");
  } finally { await f.close(); }
});

test("只保留官网可核对的品牌和名称，监测问题不能诱导品牌提及", async () => {
  const { groundedIdentity } = await import("../src/site-review/identity.ts");
  const page = "引迹 CiteGauge 帮助品牌追踪 AI 提及，提供与 Acme 的对比。";
  const identity = { brand: "引迹", category: "品牌监测工具", evidence: "引迹 CiteGauge", aliases: ["CiteGauge", "虚构"],
    rivals: ["Acme", "不存在"], question: "如何判断一个品牌在 AI 中的曝光度？" };
  const found = groundedIdentity(identity, page);
  assert.deepEqual(found.aliases, ["CiteGauge"]);
  assert.deepEqual(found.rivals, ["Acme"]);
  assert.equal(groundedIdentity({ ...identity, brand: "其他" }, page), null);
  assert.equal(groundedIdentity({ ...identity, question: "CiteGauge 好用吗？" }, page).question,
    "有哪些值得考虑的品牌监测工具，各有什么特点？");
});

test("同一官网重复建项保留原问题，首次采样只执行一次", async () => {
  const { ensureSiteMonitor } = await import("../src/site-review/monitor.ts");
  const { Workspace } = await import("../src/storage/workspace.ts");
  const f = await fixture();
  try {
    const identity = { brand: "例子", category: "客服系统", aliases: [], rivals: [], evidence: "例子", question: "怎样选择客服系统？" };
    const first = await ensureSiteMonitor(f.binding, "https://example.com/", identity);
    const again = await ensureSiteMonitor(f.binding, "https://www.example.com/about", { ...identity, question: "另一个问题" });
    assert.deepEqual(again, first);
    assert.equal(first.model, "qwen3.7-flash");
    assert.equal(first.daily, false);
    const workspace = new Workspace({ blockConcurrencyWhile: fn => fn(),
      storage: { deleteAlarm: async () => {}, setAlarm: async () => {} } }, { DB: f.binding });
    await workspace.alarm();
    await ensureSiteMonitor(f.binding, "https://example.com/", identity);
    await workspace.alarm();
    const runs = (await f.pool.query("SELECT id FROM runs")).rows;
    assert.deepEqual(runs, [{ id: "initial-" + first.id }]);
    assert.equal((await f.pool.query("SELECT due FROM monitors")).rows[0].due, 0);
  } finally { await f.close(); }
});
