import { percent } from "../core/ui.js";
const metrics = [
  { name: "品牌提及率", hit: "mentions", base: "valid", color: "#136d55" },
  {
    name: "官网引用率",
    hit: "citations",
    base: "observable",
    color: "#5786ce",
  },
  {
    name: "明确推荐率",
    hit: "recommended",
    base: "reviewed",
    color: "#aa79a9",
  },
];
export function trendConfig(report, animation) {
  const observed = new Map(report.days.map((day) => [day.day, day]));
  const oneDay = observed.size === 1;
  const dates = oneDay
    ? [...observed.keys()]
    : Array.from({ length: 30 }, (_, i) =>
        new Date(report.start + i * 86400000).toISOString().slice(0, 10),
      );
  const datasets = metrics.map((item) => ({
    label: item.name,
    borderColor: item.color,
    backgroundColor: item.color,
    data: dates.map((date) => {
      const row = observed.get(date);
      return row?.[item.base] ? (100 * row[item.hit]) / row[item.base] : null;
    }),
    borderWidth: oneDay ? 0 : 2,
    pointRadius: 3,
    borderRadius: 4,
    maxBarThickness: 38,
    spanGaps: false,
  }));
  return {
    type: oneDay ? "bar" : "line",
    data: { labels: dates.map((d) => d.slice(5)), datasets },
    options: {
      animation,
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const m = metrics[ctx.datasetIndex],
                day = observed.get(dates[ctx.dataIndex]);
              return (
                m.name +
                " " +
                percent(day[m.hit], day[m.base]) +
                " (" +
                day[m.hit] +
                "/" +
                day[m.base] +
                ")"
              );
            },
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: "#e9eeeb" },
          border: { display: false },
          ticks: { stepSize: 25, callback: (v) => v + "%" },
        },
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { maxTicksLimit: 6 },
        },
      },
    },
  };
}
export const trendLegend = metrics
  .map((m, i) => `<span><i class="swatch s${i}"></i>${m.name}</span>`)
  .join("");
