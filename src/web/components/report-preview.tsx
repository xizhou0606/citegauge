import { Activity, Quote } from "lucide-react";
import { Badge } from "../../components/ui/badge";

export function ReportPreview() {
  return (
    <aside className="report-preview" aria-label="品牌可见度报告示例">
      <div className="report-heading">
        <span><Activity size={17} />品牌可见度报告</span>
        <Badge variant="secondary">演示数据</Badge>
      </div>
      <div className="report-question">
        <span>豆包网页 · 最近 30 天</span>
        <h2>小团队如何管理客户跟进？</h2>
      </div>
      <div className="report-reading">
        <div className="mention-gauge"><strong>75<small>%</small></strong><span>品牌提及率</span></div>
        <dl className="sample-counts">
          <div><dt>提及品牌</dt><dd>9 份</dd></div>
          <div><dt>未提及</dt><dd>3 份</dd></div>
          <div><dt>有效回答</dt><dd>12 份</dd></div>
        </dl>
      </div>
      <blockquote><span><Quote size={14} />回答原文摘录</span>“可以用<mark>示例品牌 A</mark>记录客户沟通和下次跟进时间。”</blockquote>
    </aside>
  );
}
