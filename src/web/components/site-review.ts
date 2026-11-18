export const websiteInput = `<label class="form-label" for="website-url">官网网址</label>
  <div class="site-input"><input class="form-control" id="website-url" name="website" type="text"
    inputmode="url" autocomplete="url" placeholder="https://example.com" maxlength="2048" required>
    <button class="btn btn-primary" type="submit">分析官网</button></div>`;

export const websitePanel = `<section id="website-panel" aria-labelledby="website-title">
  <h1 id="website-title">官网形象分析</h1>
  <p class="text-secondary">输入公开页面的网址，千问会结合桌面首屏截图和页面正文逐模块给出修改建议。工作台保存最近一份成功报告。</p>
  <form id="website-form">${websiteInput}</form>
  <p id="website-status" role="status" aria-live="polite"></p>
  <div id="website-result"></div>
</section>`;
