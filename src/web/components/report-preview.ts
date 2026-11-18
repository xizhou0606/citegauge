import { icon } from "./shell.ts";

export const reportPreview = `<aside class="report-preview" aria-label="品牌可见度报告示例">
  <div class="report-heading"><span>${icon("activity")} 品牌可见度报告</span><small>演示数据</small></div>
  <div class="report-question"><span>豆包网页 · 最近 30 天</span><h2>小团队如何管理客户跟进？</h2></div>
  <div class="report-reading">
    <div><span>品牌提及率</span><strong>75<small>%</small></strong></div>
    <div class="sample-grid" aria-hidden="true">${"<i></i>".repeat(12)}</div>
  </div>
  <p class="report-base">12 份有效回答中，9 份提及示例品牌</p>
  <blockquote><span>回答原文摘录</span>“可以用<mark>示例品牌 A</mark>记录客户沟通和下次跟进时间。”</blockquote>
</aside>`;
