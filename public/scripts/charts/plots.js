import { $ } from "../core/ui.js";
import { trendConfig } from "./trends.js";
let charts = [];
export function clearPlots() {
  for (const chart of charts) chart.destroy();
  charts = [];
}
const slices = ["官网被引", "已核对无官网", "来源不可观测"];
export function mountPlots(report) {
  const motion = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? false
    : { duration: 460, easing: "easeOutQuart" };
  const Chart = window.Chart;
  if (!Chart) return;
  const theme = getComputedStyle(document.documentElement);
  const colors = [1, 2, 3, 4, 5].map((n) =>
    theme.getPropertyValue("--chart-" + n).trim(),
  );
  Chart.defaults.font.family = theme.getPropertyValue("--font").trim();
  Chart.defaults.color = theme.getPropertyValue("--muted-foreground").trim();
  if ($("trend-chart"))
    charts.push(new Chart($("trend-chart"), trendConfig(report, motion, colors)));
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
            backgroundColor: [colors[0], colors[3], colors[4]],
            borderWidth: 2,
            borderColor: "#fff",
            hoverOffset: 2,
          },
        ],
      },
      options: {
        cutout: "77%",
        animation: motion && { ...motion, animateRotate: true, animateScale: true },
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
      },
    }),
  );
}
