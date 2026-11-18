import { fixture } from "./d1-fixture.ts";
import test from "node:test";
import assert from "node:assert/strict";
import { history, report } from "../src/storage/report.ts";
import { monitorFrom } from "../src/domain/monitor.ts";
import { screenshotFrom } from "../src/collectors/screenshot.ts";

test("同一 UTC 窗口统计和下钻覆盖全部样本，包括被其他项目挤出最近 200 条的样本", async () => {
  const f = await fixture(),
    sql = f.pool;
  try {
    const m = monitorFrom({
      brand: "引迹",
      domain: "example.com",
      rivals: "C,未出现",
      question: "问题",
      channel: "豆包网页",
    });
    const end = Date.UTC(2026, 10, 12, 12),
      first = Date.UTC(2026, 9, 14);
    for (const id of [m.id, "other"])
      await sql.query("INSERT INTO monitors(id,config) VALUES (?1,?2)", [
        id,
        m,
      ]);
    const add = (...args: unknown[]) =>
      sql.query(
        "INSERT INTO runs(id,monitor,at,state,detail) VALUES (?1,?2,?3,?4,?5)",
        args,
      );
    const detail = JSON.stringify({
      matched: ["引迹"],
      cited: true,
      rivals: ["C", "C"],
      urls: ["https://example.com/p", "https://example.com/p"],
      review: { recommended: true },
    });
    for (let n = 0; n < 30; n++) await add("s" + n, m.id, first, "ok", detail);
    await add(
      "unknown",
      m.id,
      end,
      "ok",
      JSON.stringify({ matched: [], cited: null, rivals: [], urls: null }),
    );
    await add("failed", m.id, end, "failed", "{}");
    await add("pending", m.id, end, "pending", "{}");
    await add("old", m.id, first - 1, "ok", detail);
    for (let n = 0; n < 220; n++)
      await add("other" + n, "other", end, "ok", detail);
    const r = await report(sql, m, end);
    assert.equal(r.summary.valid, 31);
    assert.equal(r.summary.observable, 30);
    assert.equal(r.summary.reviewed, 30);
    assert.equal(r.summary.failed, 1);
    assert.equal(r.summary.pending, 1);
    assert.equal(r.rivals[0].hits, 30);
    assert.equal(r.rivals[1].hits, 0);
    assert.equal(r.sources[0].hits, 30);
    for (const [filter, value] of [
      ["mentions", ""],
      ["citations", ""],
      ["recommended", ""],
      ["rival", "C"],
      ["source", "https://example.com/p"],
    ]) {
      const params = new URLSearchParams({ end: String(end), filter, value });
      const firstPage = await history(sql, m.id, params);
      params.set("offset", "25");
      const lastPage = await history(sql, m.id, params);
      assert.ok(firstPage.more);
      assert.equal(lastPage.more, false);
      assert.equal(
        new Set([...firstPage.rows, ...lastPage.rows].map((x) => x.id)).size,
        30,
      );
    }
    const external = "https://elsewhere.example/page";
    const row = { matched: [], cited: false, urls: [external, external], rivals: ["C"] };
    await add("gap", m.id, end, "ok", row);
    await add("alsoCited", m.id, end, "ok", { ...row, matched: [m.brand],
      cited: true, urls: [external, "https://example.com"], review: { recommended: false } });
    const updated = await report(sql, m, end);
    assert.equal(updated.summary.competitorGaps, 1);
    assert.deepEqual(updated.gapSources, [{ name: external, hits: 1 }]);
    for (const [filter, expected] of Object.entries({
      competitorGap: ["gap"], gapSource: ["gap"], unreviewed: ["gap", "unknown"],
    })) {
      const params = new URLSearchParams({ end: String(end), filter, value: external });
      const result = await history(sql, m.id, params);
      assert.deepEqual(result.rows.map(r => r.id).sort(), expected);
    }
  } finally {
    await f.close();
  }
});
test("截图导入接受 PNG 字节并拒绝伪装格式", () => {
  assert.equal(screenshotFrom(null), null);
  const png =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl1bGIAAAAASUVORK5CYII=";
  assert.equal(screenshotFrom(png)?.mime, "image/png");
  assert.throws(() => screenshotFrom(png.replace("image/png", "image/jpeg")));
  assert.throws(() => screenshotFrom("data:text/html;base64,QQ=="));
});
