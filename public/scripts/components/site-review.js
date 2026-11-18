import { $, clean, action } from "../core/ui.js";
import { bindExport, moduleFields } from "./review-export.js";
import { api } from "../core/api.js";

function monitorSection(report) {
  const m = report.monitor;
  if (!m) return report.monitor === null
    ? '<p class="surface">页面中缺少可核对的品牌名称。可以提交含品牌介绍的官网页面继续分析。</p>' : "";
  return `<section class="card site-summary surface"><h2>${clean(m.brand)} · 品牌监测</h2>
    ${report.identity?.brand === m.brand ? `<small>品牌识别依据 · ${clean(report.identity.evidence)}</small>` : ""}
    ${m.aliases.length ? `<small>品牌别名 · ${clean(m.aliases.join("、"))}</small>` : ""}
    ${m.rivals.length ? `<small>官网提到的竞品 · ${clean(m.rivals.join("、"))}</small>` : ""}
    <p>${clean(m.question)}</p><button class="btn btn-light btn-sm" id="open-site-monitor">查看监测结果</button>
    <small id="initial-state" role="status"></small></section>`;
}

async function sampleStatus(id, el, settled) {
  for (let attempt = 0; attempt < 18 && el.isConnected; attempt++) {
    const { state } = await api("initial-sample/" + encodeURIComponent(id));
    el.textContent = { ok: "首次采样已完成", failed: "首次采样失败，可进入监测结果查看原因并重试",
      pending: "千问正在回答监测问题…", queued: "首次采样已排队" }[state];
    if (state === "ok" || state === "failed") {
      if (attempt > 0) await settled(id);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 4000));
  }
}

function renderReport(report, { open, settled }) {
  const target = $("website-result");
  target.innerHTML = `<section class="card site-summary surface">
    <div><h2>官网整体形象</h2><p>${clean(report.impression)}</p>
    <a href="${clean(report.url)}" target="_blank" rel="noopener noreferrer">${clean(report.title || report.url)} ↗</a>
    <small>${clean(new URL(report.url).hostname)} · ${clean(new Date(report.at).toLocaleString())}</small></div>
    <div class="d-flex gap-2 flex-wrap mt-3"><button class="btn btn-light btn-sm" data-export-review>导出完整报告</button><button class="btn btn-light btn-sm" data-export-prompt>导出 AI 修改提示词</button><button class="btn btn-light btn-sm" data-prompt="all">复制全部提示词</button>
    <button class="btn btn-light btn-sm" data-bs-toggle="collapse" data-bs-target="#website-shot" aria-expanded="false" aria-controls="website-shot">查看首屏截图</button></div><div id="website-shot" class="collapse"><img alt="分析时抓取的官网首屏" width="1280" height="960"></div></section>
    ${monitorSection(report)}<h2 class="module-heading">按模块修改</h2>${report.modules.map((m, i) => `
    <article class="card site-module surface"><h3>${clean(m.name)}</h3>
    <blockquote><strong>${m.source === "截图" ? "首屏观察" : "页面原文"}</strong> ${clean(m.evidence)}</blockquote>
    <dl>${moduleFields.filter(([key]) => m[key])
      .map(([key, label]) => `<div><dt>${label}</dt><dd>${clean(m[key])}</dd></div>`).join("")}</dl>
    <div class="mt-3"><button class="btn btn-light btn-sm" data-prompt="${i}">复制本模块修改提示词</button></div></article>`).join("")}`;
  bindExport(target, report);
  if (report.monitor) {
    $("open-site-monitor").onclick = action(() => open(report.monitor.id));
    const el = $("initial-state");
    sampleStatus(report.monitor.id, el, settled).catch(() => { el.textContent = "可在监测结果中查看采样状态"; });
  }
  target.querySelector("img").src = "data:image/jpeg;base64," + report.screenshot;
}

export function bindWebsiteReview(actions) {
  const form = $("website-form"), field = $("website-url"), status = $("website-status");
  let submitted = false;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    if (button.disabled) return;
    submitted = true;
    const url = field.value.trim();
    button.disabled = true;
    field.readOnly = true;
    form.setAttribute("aria-busy", "true");
    $("website-result").replaceChildren();
    status.textContent = "正在抓取官网、识别品牌并分析页面模块…";
    try {
      const { report } = await api("site-review", { url });
      renderReport(report, actions);
      status.textContent = report.monitor ? "官网分析完成，品牌监测已就绪。" : "官网分析完成。";
      if (report.monitor) actions.refresh(report.monitor.id).catch((error) => { status.textContent = error.message; });
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.disabled = false;
      field.readOnly = false;
      form.removeAttribute("aria-busy");
    }
  };
  let pending;
  try {
    pending = sessionStorage.getItem("cg-website");
    sessionStorage.removeItem("cg-website");
  } catch {}
  if (pending) {
    field.value = pending;
    form.requestSubmit();
    return;
  }
  api("site-review").then(({ report }) => {
    if (submitted || !report) return;
    if (!field.value) field.value = report.url;
    renderReport(report, actions);
  }).catch(() => {
    if (!submitted) status.textContent = "上次报告读取失败，仍可输入网址重新分析。";
  });
}
