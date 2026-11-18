import { websitePanel } from "./site-review.ts";
export const repo = "https://github.com/xizhou0606/citegauge";
export const icon = (name: string) =>
  `<svg class="bi" aria-hidden="true"><use href="/vendor/icons.svg#${name}"></use></svg>`;
export const brand = `<a class="brand" href="/"><i>${icon("soundwave")}</i><b>CiteGauge</b><span>引迹</span></a>`;
export const publicHeader = (login: boolean) => `<header class="public-header">${brand}<nav class="nav" aria-label="主导航"><a href="/methodology">监测方法</a><a href="/channels">采样渠道</a><a href="${repo}">GitHub ↗</a></nav>${login ? '' : '<a class="btn btn-primary" href="/workspace">进入工作台</a>'}</header>`;
export const publicFooter = `<footer class="public-footer">${brand}<a href="/about">关于项目</a><a href="${repo}">MIT · GitHub ↗</a></footer>`;
export const workspaceShell = `
<div class="console">
  <aside class="rail">${brand}<div class="rail-section">模型平台</div>
    <nav class="nav" id="platforms" aria-label="模型平台"></nav>
    <div id="platform-picker" class="dropdown"></div>
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
      <nav class="workspace-views nav nav-pills" aria-label="工作台视图">
        <a class="nav-link" href="#website" aria-current="page">官网分析</a><a class="nav-link" href="#monitoring">模型监测</a>
      </nav>
      ${websitePanel}
      <p id="status" role="status" aria-live="polite"></p>
      <div id="app" hidden><div id="scope"></div><div id="panel"></div></div>
    </div>
  </main>
</div><div class="modal fade" id="editor" tabindex="-1" aria-labelledby="dialog-title" aria-hidden="true"><div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"></div></div></div>`;
