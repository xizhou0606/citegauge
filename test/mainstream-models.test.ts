import test from "node:test";
import assert from "node:assert/strict";
import { collect, ready } from "../src/collectors/api.ts";
import { modelCatalog } from "../src/collectors/ai/factory.ts";
import { monitorFrom } from "../src/domain/monitor.ts";
import {
  groundedUrls,
  perplexityUrls,
} from "../src/collectors/ai/citations.ts";

const env = {
  DASHSCOPE_API_KEY: "fixture",
  MOONSHOT_API_KEY: "fixture",
  OPENAI_API_KEY: "fixture",
  ANTHROPIC_API_KEY: "fixture",
  GOOGLE_GENERATIVE_AI_API_KEY: "fixture",
  PERPLEXITY_API_KEY: "fixture",
};
const chat = {
  id: "chat",
  created: 1,
  model: "served",
  choices: [
    {
      index: 0,
      finish_reason: "stop",
      message: { role: "assistant", content: "答复" },
    },
  ],
};
const link = "https://example.com/guide";
const text = {
  type: "output_text",
  text: "答复",
  annotations: [
    {
      type: "url_citation",
      url: link,
      title: "示例",
      start_index: 0,
      end_index: 2,
    },
  ],
};
const response = {
  id: "r1",
  created_at: 1,
  model: "served",
  object: "response",
  status: "completed",
  output: [{ type: "message", role: "assistant", id: "m1", content: [text] }],
};
const claude = {
  id: "m1",
  type: "message",
  role: "assistant",
  model: "served",
  content: [{ type: "text", text: "答复" }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 2, output_tokens: 2 },
};
const gemini = {
  modelVersion: "served",
  candidates: [
    {
      content: { role: "model", parts: [{ text: "答复" }] },
      finishReason: "STOP",
      groundingMetadata: {
        groundingChunks: [
          { web: { uri: link, title: "示例" } },
          { web: { uri: "https://unused.example", title: "候选" } },
        ],
        groundingSupports: [
          { segment: { text: "答复" }, groundingChunkIndices: [0] },
        ],
      },
    },
  ],
};
const input = {
  brand: "引迹",
  domain: "example.com",
  question: "推荐哪些工具？",
};

for (const [channel, host, payload, urls] of [
  ["通义千问 API", "dashscope.aliyuncs.com", chat, null],
  ["Kimi API", "api.moonshot.cn", chat, null],
  ["OpenAI API", "api.openai.com", response, [link]],
  ["Claude API", "api.anthropic.com", claude, null],
  ["Gemini API", "generativelanguage.googleapis.com", gemini, [link]],
  ["Perplexity API", "api.perplexity.ai", response, [link]],
] as const) {
  test(channel + " 使用厂商端点并保留原文与引用口径", async (t) => {
    const urlsCalled: URL[] = [];
    t.mock.method(
      globalThis,
      "fetch",
      async (url: string, init: RequestInit) => {
        urlsCalled.push(new URL(url));
        assert.ok(
          JSON.stringify(JSON.parse(String(init.body))).includes(
            input.question,
          ),
        );
        return Response.json(payload);
      },
    );
    const catalog = modelCatalog(env);
    const m = monitorFrom(
      { ...input, channel, model: catalog.get(channel)?.at(-1) },
      catalog,
    );
    assert.ok(ready(env, m.channel, m.model));
    const e = await collect(env, m);
    assert.deepEqual(
      urlsCalled.map((u) => u.host),
      [host],
    );
    assert.equal(e.answer, "答复");
    assert.deepEqual(JSON.parse(e.raw), payload);
    assert.deepEqual(e.urls, urls);
  });
}

test("模型绑定到监测项，不能跨厂商或从网页调用", () => {
  const catalog = modelCatalog({ ...env, OPENAI_MODEL: "custom-deployment" });
  assert.equal(catalog.size, 8);
  assert.equal(
    monitorFrom({ ...input, channel: "OpenAI API" }, catalog).model,
    "custom-deployment",
  );
  for (const channel of ["豆包网页", "OpenAI API", "无效 API"])
    assert.throws(() =>
      monitorFrom({ ...input, channel, model: "kimi-k2.6" }, catalog),
    );
  assert.equal(ready({}, "Gemini API"), false);
});

test("API 返回候选或缺少对应段落时保留不可观测状态", () => {
  assert.equal(
    groundedUrls({ groundingChunks: [{ web: { uri: link } }] }),
    null,
  );
  assert.equal(
    groundedUrls({ groundingSupports: [{ groundingChunkIndices: [2] }] }),
    null,
  );
  assert.deepEqual(groundedUrls({ groundingSupports: [] }), []);
  assert.equal(
    perplexityUrls({
      output: [{ type: "search_results", results: [{ url: link }] }],
    }),
    null,
  );
});
