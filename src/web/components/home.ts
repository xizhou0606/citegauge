import { websiteInput } from "./site-review.ts";
import { articles } from "../articles.ts";
import { icon } from "./shell.ts";
import { reportPreview } from "./report-preview.ts";

const resourceIcons: Record<string, string> = {
  "/methodology": "bar-chart",
  "/channels": "layers",
  "/about": "book",
};
const resources = Object.entries(articles).map(([path, article]) => `
  <a class="guide-card" href="${path}">
    <span class="guide-icon">${icon(resourceIcons[path])}</span>
    <div><h3>${article.title}</h3><p>${article.summary}</p></div>
    ${icon("arrow-up-right")}
  </a>`).join("");

export const home = `<main class="public-main">
  <section class="hero">
    <div class="intro">
      <h1>你的官网，<br>给人什么印象？</h1>
      <p>只需一个官网网址。AI 会识别品牌，逐块分析官网的优势、不足和改法，并自动监测品牌在千问回答中的表现。</p>
      <form id="site-entry" action="/workspace" method="get">${websiteInput}</form>
      <div class="actions">
        <a class="text-action" href="/workspace#monitoring">进入模型监测</a>
        <a class="text-action" href="/methodology">查看监测方法</a>
      </div>
    </div>
    ${reportPreview}
  </section>
  <section class="resources"><h2>使用指南</h2><div class="guides">${resources}</div></section>
</main>`;
