const labels = {
  mentions: "提及本站品牌", citations: "引用官网", recommended: "明确推荐", failed: "失败样本",
  competitorGap: "仅提及竞品", unreviewed: "待人工复核", rival: "提及竞品",
  source: "引用来源页", gapSource: "未引用官网时的来源", noCitation: "已核对无官网", unknownCitation: "来源不可观测",
};

export const allSamples = { filter: "all", value: "", label: "全部样本", offset: 0 };

const origins = new Map([
  ["#monitoring", "可见度概览"], ["#sources", "引用来源"], ["#competitors?section=mentions", "品牌提及对比"],
]);

export function evidenceHash(id, end, filter, value = "", origin = "") {
  const params = new URLSearchParams({monitor: id, end: String(end), filter});
  if (origins.has(origin)) params.set("from", origin);
  if (value) params.set("value", value);
  return "#evidence?" + params;
}

export function readEvidenceRoute(hash) {
  if (!hash.startsWith("#evidence?")) return null;
  const params = new URLSearchParams(hash.slice(10));
  const filter = params.get("filter");
  const end = Number(params.get("end"));
  const monitor = params.get("monitor");
  if (!monitor || !Object.hasOwn(labels, filter) || !Number.isSafeInteger(end) || end <= 0 || end > 8640000000000000) return null;
  const value = params.get("value") || "";
  const label = value ? labels[filter] + " · " + value : labels[filter];
  const from = params.get("from");
  const origin = origins.has(from) ? {href: from, label: origins.get(from)} : null;
  return {monitor, end, origin, query: {filter, value, label, offset: 0}};
}
