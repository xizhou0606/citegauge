import test from "node:test";
import assert from "node:assert/strict";
import { monitorFrom, imported, measure, parseAnswer } from "../src/model.ts";
const m = monitorFrom({
  brand: "CiteGauge",
  domain: "example.com",
  aliases: "引迹",
  rivals: "Acme",
  question: "哪些工具可用？",
  channel: "豆包网页",
});
const base = {
  answer: "引迹，另见 ACME。",
  page: "https://www.doubao.com/chat/test",
  observable: true,
  urls: "https://docs.example.com/guide",
};
test("网页样本提及、竞品和子域引用", () =>
  assert.deepEqual(measure(m, imported(base, m.channel)), {
    matched: ["引迹"],
    rivals: ["Acme"],
    cited: true,
  }));
test("区分缺失、空来源和仿冒域", () => {
  for (const [data, expected] of [
    [{ observable: false }, null],
    [{ urls: "" }, false],
    [{ urls: "https://example.com.invalid" }, false],
  ] as const)
    assert.equal(
      measure(m, imported({ ...base, ...data }, m.channel)).cited,
      expected,
    );
});
test("拒绝错误渠道与非 HTTP 来源", () => {
  assert.throws(() =>
    imported({ ...base, page: "https://doubao.com.fake.com" }, m.channel),
  );
  assert.throws(() =>
    imported({ ...base, urls: "javascript:alert(1)" }, m.channel),
  );
});
test("检索结果不计为回答引用", () => {
  const p = {
    output: [
      { type: "web_search_result", results: [{ url: "https://example.com" }] },
      {
        type: "message",
        content: [{ type: "output_text", text: "答复", annotations: [] }],
      },
    ],
  };
  assert.deepEqual(parseAnswer(p, true, "ark").urls, []);
});
test("保留正文 URL 标注", () =>
  assert.deepEqual(
    parseAnswer(
      {
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: "答复",
                annotations: [
                  { type: "url_citation", url: "https://example.com" },
                ],
              },
            ],
          },
        ],
      },
      true,
      "ark",
    ).urls,
    ["https://example.com/"],
  ));
test("截断、空答案不计有效样本", () => {
  assert.throws(() =>
    parseAnswer(
      { choices: [{ finish_reason: "length", message: { content: "部分" } }] },
      false,
      "ds",
    ),
  );
  assert.throws(() => parseAnswer({}, true, "ark"));
});
