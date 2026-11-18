import { websitePanel } from "./site-review.ts";
export const repo = "https://github.com/xizhou0606/citegauge";
export const icon = (name: string) =>
  `<svg class="bi" aria-hidden="true"><use href="/vendor/icons.svg#${name}"></use></svg>`;
export const brand = `<a class="brand" href="/"><i>${icon("soundwave")}</i><b>CiteGauge</b><span>引迹</span></a>`;
export const publicHeader = (login: boolean) => `<header class="public-header">${brand}<nav class="nav" aria-label="主导航"><a href="/methodology">监测方法</a><a href="/channels">采样渠道</a><a href="${repo}">GitHub ↗</a></nav>${login ? '' : '<a class="btn btn-primary" href="/workspace">进入工作台</a>'}</header>`;
export const publicFooter = `<footer class="public-footer">${brand}<a href="/about">关于项目</a><a href="${repo}">MIT · GitHub ↗</a></footer>`;
const views = [
  ["website", "globe2", "官网分析"],
  ["monitoring", "activity", "可见度概览"],
  ["competitors", "bar-chart", "竞品对比"],
  ["sources", "link-45deg", "引用来源"],
  ["evidence", "folder2-open", "样本复核"],
];
export const workspaceShell = `
<div class="console">
  <aside class="rail">${brand}<div class="rail-section">工作台</div>
    <nav class="nav feature-nav" aria-label="工作台功能">
      ${views.map(([id, symbol, label]) => `<a class="nav-link" href="#${id}">${icon(symbol)}${label}</a>`).join("")}
    </nav>
    <div class="rail-foot">
      <a href="/methodology">${icon("book")}监测方法</a>
      <a href="/channels">${icon("layers")}采样渠道</a>
      <a href="${repo}">${icon("github")}GitHub</a>
      <button class="btn btn-link" id="lock" hidden>${icon("box-arrow-right")}退出登录</button>
    </div>
  </aside>
  <main class="console-main">
    <header class="topbar"><div>工作台 <span>/</span> <strong id="crumb">官网分析</strong></div>
      <div id="tools" hidden>
      <button id="add" class="btn btn-primary btn-sm">${icon("plus-lg")}新建监测项</button></div>
    </header>
    <div class="content">
      ${websitePanel}
      <p id="status" role="status" aria-live="polite"></p>
      <div id="app" hidden><div id="scope"></div><div id="panel"></div></div>
    </div>
  </main>
</div><div class="modal fade" id="editor" tabindex="-1" aria-labelledby="dialog-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"></div></div></div>`;
