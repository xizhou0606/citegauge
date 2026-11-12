import assert from "node:assert/strict";
import test from "node:test";
import { platforms } from "../src/domain/platforms.ts";
import { channels } from "../src/domain/monitor.ts";
import { trendConfig } from "../public/scripts/charts/trends.js";

test("每个已支持渠道恰好属于一个模型平台", () => {
  assert.deepEqual(
    platforms.flatMap((p) => p.channels).sort(),
    [...channels].sort(),
  );
});
test("单日作对比，多日缺样本断线，未知分母不绘为零", () => {
  const start = Date.UTC(2026, 10, 1);
  const observation = {
    day: "2026-11-01",
    mentions: 0,
    valid: 1,
    observable: 0,
    reviewed: 0,
  };
  const one = trendConfig({ start, days: [observation] }, false);
  assert.equal(one.type, "bar");
  assert.equal(one.data.datasets[0].data[0], 0);
  assert.equal(one.data.datasets[1].data[0], null);
  assert.equal(one.options.animation, false);
  const multi = trendConfig(
    { start, days: [observation, { ...observation, day: "2026-11-03" }] },
    false,
  );
  assert.equal(multi.type, "line");
  assert.equal(multi.data.labels.length, 30);
  assert.deepEqual(multi.data.datasets[0].data.slice(0, 3), [0, null, 0]);
  assert.equal(multi.data.datasets[0].spanGaps, false);
});
