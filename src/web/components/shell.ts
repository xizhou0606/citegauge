export const repo = "https://github.com/xizhou0606/citegauge";
export const icon = (name: string) =>
  `<svg class="bi" aria-hidden="true"><use href="/vendor/icons.svg#${name}"></use></svg>`;
export const brand = `<a class="brand" href="/"><i>${icon("soundwave")}</i><b>CiteGauge</b><span>引迹</span></a>`;
export const publicHeader = `<header class="public-header">${brand}<nav><a href="/methodology">监测方法</a><a href="/channels">采样渠道</a><a href="${repo}">GitHub ↗</a></nav><a class="btn btn-primary" href="/workspace">进入工作台</a></header>`;
export const publicFooter = `<footer class="public-footer">${brand}<a href="/about">关于项目</a><a href="${repo}">MIT · GitHub ↗</a></footer>`;
export const workspaceShell = `
<div class="console">
  <aside class="rail">${brand}<div class="rail-section">模型平台</div>
    <nav id="platforms" aria-label="模型平台"></nav>
    <div class="rail-foot">
      <a href="/methodology">${icon("book")}监测方法</a>
      <a href="/channels">${icon("layers")}采样渠道</a>
      <a href="${repo}">${icon("github")}GitHub</a>
      <button id="lock" hidden>${icon("box-arrow-right")}退出登录</button>
    </div>
  </aside>
  <main class="console-main">
    <header class="topbar"><div>工作台 <span>/</span> <strong id="crumb">监测概览</strong></div>
      <div id="tools" hidden><button id="self" class="btn btn-light btn-sm">监测引迹自身</button>
      <button id="add" class="btn btn-primary btn-sm">${icon("plus-lg")}新建监测项</button></div>
    </header>
    <div class="content">
      <p id="status" role="status" aria-live="polite"></p>
      <div id="app" hidden><div id="scope"></div><div id="panel"></div></div>
    </div>
  </main>
</div><dialog id="editor" aria-labelledby="dialog-title"></dialog>`;
