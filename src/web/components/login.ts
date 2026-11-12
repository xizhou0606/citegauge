import { brand, icon, repo } from "./shell.ts";

export const loginPage = `<main class="login-page">
  <section class="signal-panel" aria-label="引迹品牌可见度监测">
    ${brand}
    <canvas id="signal-field" aria-hidden="true"></canvas>
    <div class="signal-caption"><h2>品牌可见度监测</h2>
      <p>追踪品牌在 AI 回答中的提及、推荐与引用。</p></div>
  </section>
  <section class="login-side">
    <a class="home-link" href="/">← 返回首页</a>
    <div class="login-box">
      <h1>登录工作台</h1>
      <form id="login-form" method="post" action="/login">
        <label for="username">账号</label>
        <input id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required placeholder="输入账号">
        <label for="password">密码</label>
        <div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required placeholder="输入密码">
          <button type="button" id="reveal" aria-label="显示密码" aria-pressed="false">显示</button></div>
        <p id="login-error" role="alert" hidden></p>
        <button class="submit-login" type="submit">登录 <span aria-hidden="true">→</span></button>
      </form>
    </div>
    <footer><a href="/methodology">监测方法</a><a href="${repo}">${icon("github")} GitHub</a></footer>
  </section>
</main>`;
