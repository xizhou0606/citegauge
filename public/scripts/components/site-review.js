import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { $ } from "../core/ui.js";
import { api } from "../core/api.js";
import { SiteReport } from "./site-report.jsx";

export function bindWebsiteReview(actions) {
  const root = createRoot($("website-result"));
  const renderReport = (report) => root.render(createElement(SiteReport, { report, actions }));
  const form = $("website-form"),
    field = $("website-url"),
    status = $("website-status");
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
    root.render(null);
    status.textContent = "正在抓取官网、识别品牌并分析页面模块…";
    try {
      const { report } = await api("site-review", { url });
      renderReport(report);
      status.textContent = report.monitor ? "官网分析完成，品牌监测已就绪。" : "官网分析完成。";
      if (report.monitor)
        actions.refresh(report.monitor.id).catch((error) => {
          status.textContent = error.message;
        });
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
  api("site-review")
    .then(({ report }) => {
      if (submitted || !report) return;
      if (!field.value) field.value = report.url;
      renderReport(report);
    })
    .catch(() => {
      if (!submitted) status.textContent = "上次报告读取失败，仍可输入网址重新分析。";
    });
}
