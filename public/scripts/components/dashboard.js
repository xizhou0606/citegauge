import { $, clean, icon, action } from "../core/ui.js";
import { api } from "../core/api.js";
import { historySection, historyList } from "./history.js";
import { metricsSection, breakdownSection } from "./metrics.js";
import { plotsSection, mountPlots, clearPlots } from "../charts/plots.js";
import { samplingButtons, bindSampling } from "./sampling.js";

let sequence = 0;
export async function renderDashboard(m, ready, refresh, onCreate) {
  const request = ++sequence,
    panel = $("panel");
  clearPlots();
  if (!m) {
    panel.innerHTML = `<section class="surface empty-platform">${icon("folder2-open")}<h2>该渠道暂无监测项</h2>
    <button id="first-monitor" class="btn btn-primary">新建监测项</button></section>`;
    $("first-monitor").onclick = onCreate;
    return;
  }
  panel.innerHTML = '<p class="empty" role="status">正在读取样本…</p>';
  const report = await api("report/" + m.id);
  if (request !== sequence) return;
  const date = (t) => new Date(t).toISOString().slice(0, 10);
  panel.innerHTML = `<section class="monitor-head"><div><p class="brand-domain">${clean(m.brand)} <span>·</span> ${clean(m.domain)}${m.model ? " · " + clean(m.model) : ""}</p>
    <h2>${clean(m.question)}</h2><div class="date-range">${icon("calendar3")}${date(report.start)} — ${date(report.end)} · UTC</div></div>
    <div class="sampling-actions">${samplingButtons(m, ready)}</div></section>
    ${metricsSection(report.summary)}${plotsSection(report)}${breakdownSection(m, report)}${historySection}`;
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
