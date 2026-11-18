import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { $ } from "../core/ui.js";
import { api } from "../core/api.js";
import { SiteReport } from "./site-report.jsx";

export function bindWebsiteReview(actions) {
  const root = createRoot($("website-result"));
  let activeReport, selectedDomain, loaded = false, version = 0;
  function renderReport(report) {
    activeReport = report;
    $("website-entry").hidden = !form.contains(document.activeElement) || submitted;
    root.render(
      createElement(SiteReport, {
        key: report.at + report.url,
        report,
        actions,
        onAnalyze: openWebsiteEntry,
        onIndustry: async (sources) => {
          const result = await api("site-review", { domain:selectedDomain, industryAt: report.at, expandIndustry: true, sources });
          if (activeReport === report) renderReport(result.report);
        },
        onExpand: async () => {
          const expanded = await api("site-review", { domain:selectedDomain, expandAt: report.at });
          if (activeReport === report) renderReport(expanded.report);
        },
      }),
    );
  }
  const form = $("website-form"),
    field = $("website-url"),
    status = $("website-status");
  let submitted = false;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    if (button.disabled) return;
    const token = ++version;
    submitted = true;
    const url = field.value.trim();
    button.disabled = true;
    field.readOnly = true;
    form.setAttribute("aria-busy", "true");

    status.textContent = "正在抓取官网，分析品牌形象和各模块的优势与不足…";
    try {
      const { report } = await api("site-review", { url });
      if (token !== version) return;
      selectedDomain = new URL(report.url).hostname.replace(/^www\./,"");
      loaded = true;
      renderReport(report);
      status.textContent = "";
      await actions.refresh(report.monitor?.id,selectedDomain);
    } catch (error) {
      if (token === version) status.textContent = error.message;
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
  return {
    start() {
      if (pending) { openWebsiteEntry(pending); form.requestSubmit(); }
    },
    async scope(domain, visible) {
      if (selectedDomain !== domain) {
        ++version;
        selectedDomain = domain;
        loaded = false;
        submitted = false;
        activeReport = null;
        root.render(null);
        field.value = domain ? "https://" + domain : "";
        status.textContent = "";
        $("website-entry").hidden = false;
      }
      if (!domain || !visible || loaded) return;
      const token = version;
      loaded = true;
      try {
        const {report} = await api("site-review?domain="+encodeURIComponent(domain));
        if (token !== version || !report) return;
        if (!form.contains(document.activeElement)) field.value = report.url;
        renderReport(report);
      } catch {
        if (token === version) {
          loaded = false;
          status.textContent = "官网报告读取失败，可重新打开官网分析。";
        }
      }
    },
  };
}

export function openWebsiteEntry(domain) {
  $("website-entry").hidden = false;
  const field = $("website-url");
  field.value = typeof domain === "string" ? domain : "";
  field.focus();
  field.select();
}
