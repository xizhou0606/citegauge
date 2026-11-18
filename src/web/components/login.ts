import { icon } from "./shell.ts";

import { reportPreview } from "./report-preview.ts";

export const loginPage = `<main class="login-page"><section class="login-box">
  <div class="login-symbol">${icon("box-arrow-in-right")}</div>
  <h1>登录监测工作台</h1>
  <p class="login-intro">使用管理员账号查看监测问题和采样证据。</p>
  <form id="login-form" method="post" action="/login">
    <label class="form-label" for="username">账号</label>
    <input class="form-control" id="username" name="username" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required>
    <label class="form-label" for="password">密码</label>
    <div class="input-group"><input class="form-control" id="password" name="password" type="password" autocomplete="current-password" required>
      <button class="btn btn-light" type="button" id="reveal" aria-label="显示密码" aria-pressed="false">显示</button></div>
    <p id="login-error" class="alert alert-danger" role="alert" hidden></p>
    <button class="btn btn-primary w-100" type="submit">登录工作台</button>
  </form>
</section>${reportPreview}</main>`;
