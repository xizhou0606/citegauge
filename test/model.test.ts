import test from "node:test";
import assert from "node:assert/strict";
import {monitorFrom} from "../src/domain/monitor.ts";
import {measure} from "../src/domain/metrics.ts";
import {imported} from "../src/collectors/web-import.ts";
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
