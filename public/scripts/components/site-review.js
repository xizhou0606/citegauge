import { $, clean } from "../core/ui.js";
import { api } from "../core/api.js";

function renderReport(report) {
  const target = $("website-result");
  target.innerHTML = `<section class="site-summary surface">
    <div><h2>官网整体形象</h2><p>${clean(report.impression)}</p>
    <a href="${clean(report.url)}" target="_blank" rel="noopener noreferrer">${clean(report.title || report.url)} ↗</a>
    <small>${clean(new URL(report.url).hostname)} · ${clean(new Date(report.at).toLocaleString())}</small></div>
    <details><summary>查看桌面首屏截图</summary><img alt="分析时抓取的官网首屏" width="1280" height="960"></details></section>
    <h2 class="module-heading">按模块修改</h2>${report.modules.map((m) => `
    <article class="site-module surface"><h3>${clean(m.name)}</h3>
    <blockquote><strong>${m.source === "截图" ? "首屏观察" : "页面原文"}</strong> ${clean(m.evidence)}</blockquote>
    <dl>${[["优势", m.strength], ["不足", m.weakness], ["如何修改", m.change]]
      .map(([label, value]) => `<div><dt>${label}</dt><dd>${clean(value)}</dd></div>`).join("")}</dl></article>`).join("")}`;
  target.querySelector("img").src = "data:image/jpeg;base64," + report.screenshot;
}

export function bindWebsiteReview() {
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
    status.textContent = "正在打开官网、截取首屏并分析页面模块…";
    try {
      const { report } = await api("site-review", { url });
      renderReport(report);
      status.textContent = "已完成分析，可展开截图核对首屏。";
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
    renderReport(report);
  }).catch(() => {
    if (!submitted) status.textContent = "上次报告读取失败，仍可输入网址重新分析。";
  });
}
