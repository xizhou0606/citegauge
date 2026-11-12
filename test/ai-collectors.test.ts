import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { collect, ready } from "../src/collectors/api.ts";
import { monitorFrom } from "../src/domain/monitor.ts";

const env = {
  ARK_API_KEY: "ark-test",
  ARK_MODEL: "endpoint",
  DEEPSEEK_API_KEY: "ds-test",
};
const question = "推荐哪些工具？";
const monitor = (channel: string) =>
  monitorFrom({ brand: "引迹", domain: "example.com", question, channel });
const ark = monitor("火山方舟 API");
const ds = monitor("DeepSeek API");

function transport(t: TestContext, payload: unknown, status = 200) {
  const requests: Request[] = [];
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    requests.push(new Request(url, init));
    return Response.json(payload, { status });
  });
  return requests;
}

const citation = {
  type: "url_citation",
  url: "https://example.com",
  title: "示例",
  start_index: 0,
  end_index: 2,
};
const part = (annotations?: unknown[]) => ({
  type: "output_text",
  text: "答复",
  annotations,
});
const message = (...content: unknown[]) => ({
  type: "message",
  id: "m1",
  role: "assistant",
  content,
});
const response = (...output: unknown[]) => ({
  id: "r1",
  status: "completed",
  model: "ark-served",
  output,
});
const deepResponse = (finish_reason: string, content: string) => ({
  model: "ds-served",
  choices: [{ finish_reason, message: { role: "assistant", content } }],
});

test("方舟走 Responses，使用内置搜索并保存服务返回的模型和原始证据", async (t) => {
  const raw = response(message(part([citation])));
  const requests = transport(t, raw);
  const sample = await collect(env, ark);
  assert.equal(requests.length, 1);
  const [request] = requests;
  assert.equal(
    request.url,
    "https://ark.cn-beijing.volces.com/api/v3/responses",
  );
  assert.equal(request.headers.get("authorization"), "Bearer ark-test");
  const body = await request.json();
  assert.deepEqual(body.tools, [{ type: "web_search" }]);
  assert.equal(body.max_output_tokens, 2000);
  assert.equal(body.model, env.ARK_MODEL);
  assert.match(JSON.stringify(body.input), new RegExp(question));
  assert.equal(body.include, undefined);
  assert.deepEqual(sample, {
    answer: "答复",
    page: "",
    urls: ["https://example.com/"],
    model: "ark-served",
    raw: JSON.stringify(raw),
  });
});

for (const [label, parts, expected] of [
  ["候选不计引用", [part([])], []],
  ["部分段落缺失标注", [part([]), part()], null],
  [
    "兼容方舟正文标注",
    [part([{ type: "url_citation", url: "https://example.com" }])],
    ["https://example.com/"],
  ],
] as const) {
  test(label, async (t) => {
    const candidate = {
      type: "web_search_result",
      results: [{ url: "https://unused.example" }],
    };
    const raw = response(candidate, message(...parts));
    const requests = transport(t, raw);
    const sample = await collect(env, ark);
    assert.equal(requests.length, 1);
    assert.deepEqual(JSON.parse(sample.raw), JSON.parse(JSON.stringify(raw)));
    assert.deepEqual(sample.urls, expected);
  });
}

test("DeepSeek 保持 Chat 协议和关闭思考，引用不可观测", async (t) => {
  const raw = deepResponse("stop", "答复");
  const requests = transport(t, raw);
  const sample = await collect(env, ds);
  const [request] = requests;
  assert.equal(request.url, "https://api.deepseek.com/chat/completions");
  assert.equal(request.headers.get("authorization"), "Bearer ds-test");
  const body = await request.json();
  assert.deepEqual(body.messages, [{ role: "user", content: question }]);
  assert.equal(body.model, "deepseek-flash");
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal(body.max_tokens, 2000);
  assert.deepEqual(sample, {
    answer: "答复",
    page: "",
    urls: null,
    model: "ds-served",
    raw: JSON.stringify(raw),
  });
});

for (const [label, target, raw] of [
  [
    "方舟状态为未完成",
    ark,
    { ...response(message(part([]))), status: "incomplete" },
  ],
  ["方舟空正文", ark, response()],
  ["方舟畸形输出", ark, response({ type: "message", content: "unexpected" })],
  ["DeepSeek 截断", ds, deepResponse("length", "部分答案")],
  ["DeepSeek 空正文", ds, deepResponse("stop", " ")],
  ["证据超出容量", ds, deepResponse("stop", "样".repeat(220000))],
] as const) {
  test(label, async (t) => {
    transport(t, raw);
    await assert.rejects(collect(env, target));
  });
}

test("缺少密钥和网页渠道不调用模型，限流保持失败且不重试", async (t) => {
  const requests = transport(
    t,
    { error: { message: "internal provider detail" } },
    429,
  );
  assert.equal(ready(env, "豆包网页"), false);
  assert.equal(ready({ ...env, ARK_MODEL: "" }, ark.channel), false);
  await assert.rejects(collect({}, ds), /密钥/);
  assert.equal(requests.length, 0);
  await assert.rejects(collect(env, ds), /^Error: 采集服务 HTTP 429$/);
  assert.equal(requests.length, 1);
});
