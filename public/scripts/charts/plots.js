import { $, clean, percent } from "../core/ui.js";
import { trendConfig, trendLegend } from "./trends.js";
let charts = [];
export function clearPlots() {
  for (const chart of charts) chart.destroy();
  charts = [];
}
const slices = ["官网被引", "已核对无官网", "来源不可观测"];
const colors = ["#14705b", "#9bbce4", "#e0e6e2"];
export function plotsSection(report) {
  const c = report.summary;
  const portions = [
    c.citations,
    c.observable - c.citations,
    c.valid - c.observable,
  ];
  const table = report.days
    .map(
      (
        d,
      ) => `<tr><td>${clean(d.day)}</td><td>${d.valid}</td><td>${percent(d.mentions, d.valid)}</td>
    <td>${percent(d.citations, d.observable)}</td><td>${percent(d.recommended, d.reviewed)}</td></tr>`,
    )
    .join("");
  return `<div class="plot-grid"><section class="surface"><div class="section-head"><h2>${report.days.length === 1 ? "单日可见度对比" : "可见度趋势"}</h2><span class="caption">最近 30 天 · UTC</span></div>
  <div class="legend">${trendLegend}</div>${report.days.length ? '<div class="plot"><canvas id="trend-chart" role="img" aria-label="品牌提及、官网引用与明确推荐率，数据见下方明细"></canvas></div>' : '<p class="empty">尚无采样记录</p>'}
  <details class="chart-data"><summary>查看每日明细（${report.days.length} 天有样本）</summary><div class="table-responsive"><table class="table table-sm">
  <thead><tr><th>日期</th><th>有效</th><th>提及率</th><th>引用率</th><th>推荐率</th></tr></thead><tbody>${table}</tbody></table></div></details></section>
  <section class="surface"><div class="section-head"><h2>引用分布</h2><span class="caption">按有效回答</span></div>
  <div class="donut"><canvas id="citation-chart" role="img" aria-label="引用状态分布，数据见下方列表"></canvas><div><strong>${c.valid}</strong><span>有效样本</span></div></div>
  <ul class="distribution">${slices.map((label, i) => `<li><span><i class="swatch d${i}"></i>${label}</span><b>${portions[i]} 条</b></li>`).join("")}</ul></section></div>`;
}
export function mountPlots(report) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? false
    : { duration: 600, easing: "easeOutQuart" };
  const Chart = window.Chart;
  if (!Chart) return;
  Chart.defaults.font.family = '"Inter","PingFang SC",system-ui,sans-serif';
  Chart.defaults.color = "#61716c";
  if ($("trend-chart"))
    charts.push(new Chart($("trend-chart"), trendConfig(report, motion)));
  const c = report.summary;
  charts.push(
    new Chart($("citation-chart"), {
      type: "doughnut",
      data: {
        labels: slices,
        datasets: [
          {
            data: [
              c.citations,
              c.observable - c.citations,
              c.valid - c.observable,
            ],
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: "#fff",
            hoverOffset: 2,
          },
        ],
      },
      options: {
        cutout: "77%",
        animation: motion,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    }),
  );
}
