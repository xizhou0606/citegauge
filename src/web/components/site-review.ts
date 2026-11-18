export const websiteInput = `<label class="form-label" for="website-url">官网网址</label>
  <div class="site-input"><input class="form-control" id="website-url" name="website" type="text"
    inputmode="url" autocomplete="url" placeholder="https://example.com" maxlength="2048" required>
    <button class="btn btn-primary" type="submit">分析官网</button></div>`;

export const websitePanel = `<section id="website-panel" aria-labelledby="website-title">
  <h1 id="website-title">官网形象分析</h1>
  <p class="text-secondary">输入官网网址，AI 会从首屏和正文识别品牌，按模块给出修改建议，并自动创建监测问题、发起首次采样。</p>
  <form id="website-form">${websiteInput}</form>
  <p id="website-status" role="status" aria-live="polite"></p>
  <div id="website-result"></div>
</section>`;
