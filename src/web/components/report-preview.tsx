import { Activity } from "lucide-react";
import { Badge } from "../../components/ui/badge";

export function ReportPreview() {
  return (
    <aside className="report-preview" aria-label="品牌可见度报告示例">
      <div className="report-heading">
        <span>
          <Activity className="inline size-4" /> 品牌可见度报告
        </span>
        <Badge variant="secondary">演示数据</Badge>
      </div>
      <div className="report-question">
        <span>豆包网页 · 最近 30 天</span>
        <h2>小团队如何管理客户跟进？</h2>
      </div>
      <div className="report-reading">
        <div>
          <span>品牌提及率</span>
          <strong>
            75<small>%</small>
          </strong>
        </div>
        <div className="sample-grid" aria-hidden="true">
          {Array.from({ length: 12 }, (_, i) => (
            <i key={i} />
          ))}
        </div>
      </div>
      <p className="report-base">12 份有效回答中，9 份提及示例品牌</p>
      <blockquote>
        <span>回答原文摘录</span>“可以用<mark>示例品牌 A</mark>记录客户沟通和下次跟进时间。”
      </blockquote>
    </aside>
  );
}
