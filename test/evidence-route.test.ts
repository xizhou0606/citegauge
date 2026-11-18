import test from "node:test";
import assert from "node:assert/strict";
import { evidenceHash, readEvidenceRoute } from "../public/scripts/core/evidence-route.js";

test("跨菜单复核保留监测项、时间窗、筛选值与返回的视图", () => {
  const value = "https://example.com/案例?x=1&y=2#demo";
  const route = readEvidenceRoute(evidenceHash("m-1", 1660000000000, "source", value, "#sources"));
  assert.deepEqual(route, {monitor: "m-1", end: 1660000000000, origin: {href: "#sources", label: "引用来源"},
    query: {filter: "source", value, label: "引用来源页 · " + value, offset: 0}});
  assert.equal(readEvidenceRoute("#evidence"), null);
  assert.equal(readEvidenceRoute("#evidence?filter=bad&monitor=m&end=123"), null);
  assert.equal(readEvidenceRoute(evidenceHash("m", 123, "rival", "", "#competitors?section=mentions"))?.origin?.href,
    "#competitors?section=mentions");
});
