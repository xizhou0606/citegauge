import { $, clean, icon, action } from "../core/ui.js";
import { api } from "../core/api.js";
import { historySection, historyList } from "./history.js";
import { metricsSection, breakdownSection } from "./metrics.js";
import { plotsSection, mountPlots, clearPlots } from "../charts/plots.js";
import { samplingButtons, bindSampling } from "./sampling.js";

let sequence = 0;
let reportUrl;
export async function renderDashboard(m, ready, refresh, onCreate) {
  const request = ++sequence,
    panel = $("panel");
  if (reportUrl) URL.revokeObjectURL(reportUrl);
  clearPlots();
  if (!m) {
    panel.innerHTML = `<section class="card surface empty-platform">
      <div><h2>添加第一个监测问题</h2><p>选定品牌，写下用户会向模型提出的问题，就可以开始采样并核对回答。</p>
      <button id="first-monitor" class="btn btn-primary">${icon("plus-lg")}新建监测项</button></div>
      <aside class="question-example"><span>${icon("file-earmark-text")} 监测问题示例</span>
      <blockquote>小团队如何管理客户跟进？</blockquote></aside></section>`;
    $("first-monitor").onclick = onCreate;
    return;
  }
  panel.innerHTML = '<p class="empty" role="status">正在读取样本…</p>';
  const report = await api("report/" + m.id);
  if (request !== sequence) return;
  const date = (t) => new Date(t).toISOString().slice(0, 10);
  panel.innerHTML = `<section class="monitor-head"><div><p class="brand-domain">${clean(m.brand)} <span>·</span> ${clean(m.domain)}${m.model ? " · " + clean(m.model) : ""}</p>
    <h2>${clean(m.question)}</h2><div class="date-range">${icon("calendar3")}${date(report.start)} — ${date(report.end)} · UTC</div></div>
    <div class="sampling-actions">${samplingButtons(m, ready)}<a id="export-report" class="btn btn-light btn-sm" href="/api/report/${encodeURIComponent(m.id)}" download="citegauge-${date(report.end)}.json">导出报告</a></div></section>
    ${metricsSection(report.summary)}${plotsSection(report)}${breakdownSection(m, report)}${historySection}`;
  const exportLink = $("export-report");
  const blob = new Blob([JSON.stringify({ monitor: m, ...report }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  exportLink.href = url;
  reportUrl = url;
  mountPlots(report);
  bindSampling(m, refresh);
  const list = historyList(m, report, refresh);
  for (const button of panel.querySelectorAll("[data-filter]")) {
    button.onclick = action(async () => {
      const label = (button.getAttribute("aria-label") || button.textContent)
        .replace("，查看样本", "")
        .trim();
      await list(button.dataset.filter, button.dataset.value || "", 0, label);
      if (request === sequence)
        $("history-title").scrollIntoView({ block: "nearest" });
    });
  }
  await list();
}
