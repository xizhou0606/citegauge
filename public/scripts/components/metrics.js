import { clean, icon, percent } from "../core/ui.js";
export function metricsSection(c) {
  const metrics = [
    [
      "mentions",
      "品牌提及率",
      percent(c.mentions, c.valid),
      c.mentions + " / " + c.valid + " 有效回答",
      "activity",
    ],
    [
      "citations",
      "官网引用率",
      percent(c.citations, c.observable),
      c.citations + " / " + c.observable + " 可判定回答",
      "link-45deg",
    ],
    [
      "recommended",
      "明确推荐率",
      percent(c.recommended, c.reviewed),
      c.reviewed
        ? c.recommended + " / " + c.reviewed + " 已复核"
        : "尚无已复核回答",
      "check2-circle",
    ],
    [
      "failed",
      "失败样本",
      c.failed,
      "共 " + c.total + " 次采样 · 待完成 " + c.pending,
      "exclamation-circle",
    ],
  ];
  return (
    '<div class="kpi-grid">' +
    metrics
      .map(
        (
          [key, label, value, note, symbol],
          i,
        ) => `<button class="kpi surface k${i}" data-filter="${key}" aria-label="${label} ${note}，查看样本">
    <span class="kpi-title"><i>${icon(symbol)}</i>${label}</span><strong>${value}</strong><small>${note}</small></button>`,
      )
      .join("") +
    "</div>"
  );
}
export function breakdownSection(m, data) {
  const items = [
    { name: m.brand, hits: data.summary.mentions, kind: "mentions" },
    ...data.rivals.map((r) => ({ ...r, kind: "rival" })),
  ];
  return `<div class="plot-grid breakdown"><section class="surface"><h2>品牌与竞品提及</h2>
  <div class="ranking">${items
    .map(
      (
        r,
      ) => `<button data-filter="${r.kind}" data-value="${clean(r.name)}" class="ranking-row">
  <span>${clean(r.name)}</span><progress value="${r.hits}" max="${data.summary.valid || 1}"></progress><b>${r.hits} / ${data.summary.valid}</b></button>`,
    )
    .join("")}</div></section>
  <section class="surface"><h2>引用来源</h2><div class="source-list">${
    data.sources
      .map(
        (
          s,
          i,
        ) => `<button data-filter="source" data-value="${clean(s.name)}" class="source-row">
  <small>${i + 1}</small><span>${clean(s.name)}</span><b>${s.hits} 条</b></button>`,
      )
      .join("") || '<p class="empty">尚无已核对的来源网址</p>'
  }</div></section></div>`;
}
