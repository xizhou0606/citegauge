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
      <h1>你的品牌，<br>出现在 <em>AI</em><br>的回答里吗？</h1>
      <p>追踪模型何时提及你的品牌、推荐了谁、引用了哪个网站。每个数字都可以回到回答原文核对。</p>
      <div class="actions">
        <a class="btn btn-primary" href="/workspace">进入监测工作台 ${icon("arrow-right")}</a>
        <a class="text-action" href="/methodology">查看监测方法</a>
      </div>
    </div>
    ${reportPreview}
  </section>
  <section class="resources"><h2>使用指南</h2><div class="guides">${resources}</div></section>
</main>`;
