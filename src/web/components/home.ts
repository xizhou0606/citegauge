import { articles } from "../articles.ts";
import { icon } from "./shell.ts";

const resourceIcons: Record<string, string> = {
  "/methodology": "bar-chart",
  "/channels": "layers",
  "/about": "book",
};
const resources = Object.entries(articles).map(([path, article]) => `
  <a class="card guide-card" href="${path}">
    <span class="guide-icon">${icon(resourceIcons[path])}</span>
    <h3>${article.title} ${icon("arrow-up-right")}</h3>
    <p>${article.summary}</p>
  </a>`).join("");

export const home = `<main class="public-main">
  <section class="hero">
    <div class="intro">
      <h1>追踪品牌在<br><span>AI 回答</span>中的表现</h1>
      <p>在同一个问题下比较品牌提及、竞品与官网引用。点开每个数字，都能回到回答原文。</p>
      <div class="actions">
        <a class="btn btn-primary" href="/workspace">进入监测工作台 ${icon("arrow-up-right")}</a>
        <a class="btn btn-light" href="/methodology">查看监测方法</a>
      </div>
    </div>
    <aside class="card specimen" aria-label="监测报告示例">
      <div class="specimen-head"><h2>${icon("bar-chart")} 品牌可见度报告</h2><span class="badge">演示数据</span></div>
      <div class="card-body">
        <p class="sample-channel">豆包网页 · 最近 30 天</p>
        <h3>小团队如何管理客户跟进？</h3>
        <div class="sample-result"><div><span>品牌提及率</span><strong>75<small>%</small></strong></div>
          <p>12 份有效回答中<br><b>9 份提及示例品牌</b></p></div>
        <progress class="sample-progress" value="9" max="12" aria-label="9 份回答提及品牌，共 12 份"></progress>
        <blockquote>“可以用<mark>示例品牌 A</mark>记录客户沟通和下次跟进时间。”</blockquote>
      </div>
    </aside>
  </section>
  <section class="resources"><h2>使用指南</h2><div class="cards">${resources}</div></section>
</main>`;
