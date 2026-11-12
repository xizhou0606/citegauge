import { articles } from "../articles.ts";

const resources = Object.entries(articles)
  .map(
    ([path, article]) => `
  <a href="${path}"><strong>${article.title} ↗</strong><p>${article.summary}</p></a>`,
  )
  .join("");

export const home = `<main>
  <section class="hero">
    <div class="intro">
      <small>生成式引擎优化 · 开源监测台</small>
      <h1>你的品牌，<br>在 AI 回答的<span>哪里？</span></h1>
      <p>持续追踪同一组问题，核对品牌提及、竞品和官网引用。每个数字都能回到一份回答原文。</p>
      <div class="actions"><a class="btn btn-primary" href="/workspace">进入监测工作台 ↗</a>
        <a href="/methodology">了解指标口径 →</a></div>
    </div>
    <aside class="specimen"><div class="cap"><b>样本解读</b><span>演示数据</span></div>
      <p class="mono">DOUBAO WEB · 网页人工取样</p><h2>小团队可以怎样管理客户跟进？</h2>
      <blockquote>如果团队需要共享客户记录，可以评估<mark>示例品牌 A</mark>的协作功能，再比较录入成本。</blockquote>
      <div class="pair"><span>品牌提及</span><b>命中 1 个品牌</b></div>
      <div class="pair"><span>官网引用</span><b>不可观测</b></div>
    </aside>
  </section>
  <section class="resources"><h2>使用指南</h2><div class="cards">${resources}</div></section>
</main>`;
