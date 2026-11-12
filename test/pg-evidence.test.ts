import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./pg-fixture.ts";
import { saveImported } from "../src/storage/samples.ts";
import { monitorFrom } from "../src/domain/monitor.ts";
import { reviewSample } from "../src/storage/review.ts";
import { report } from "../src/storage/report.ts";

test("PG 原文、截图和推荐复核可回读，重试同一编号保持唯一", async () => {
  const f = await fixture();
  try {
    const m = monitorFrom({
      brand: "引迹",
      domain: "example.com",
      question: "哪些工具可用？",
      channel: "豆包网页",
    });
    await f.pool.query("INSERT INTO monitors(id,config) VALUES($1,$2)", [
      m.id,
      m,
    ]);
    const id = "test-sample",
      answer = "我推荐引迹。";
    const bytes =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl1bGIAAAAASUVORK5CYII=";
    const body = {
      answer,
      page: "https://www.doubao.com/chat/fixture",
      observable: true,
      urls: "https://example.com/",
      screenshot: "data:image/png;base64," + bytes,
    };
    await Promise.all([
      saveImported(f.pool, m, id, body),
      saveImported(f.pool, m, id, body),
    ]);
    const review = await reviewSample(f.pool, m.id, {
      run: id,
      recommended: true,
      quote: answer,
    });
    assert.equal(review.status, 200);
    const summary = (await report(f.pool, m, Date.now())).summary;
    assert.deepEqual(
      [summary.total, summary.mentions, summary.citations, summary.recommended],
      [1, 1, 1, 1],
    );
    const stored = (
      await f.pool.query(
        "SELECT raw,bytes FROM runs JOIN screenshots ON run=id WHERE id=$1",
        [id],
      )
    ).rows[0];
    assert.equal(JSON.parse(stored.raw).answer, answer);
    assert.equal(stored.bytes.toString("base64"), bytes);
  } finally {
    await f.close();
  }
});
