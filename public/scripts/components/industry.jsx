import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function Industry({ industry, onAnalyze }) {
  const rows = industry?.rows || [];
  const ranked = {高: 0, 中: 1, 低: 2};
  const sorted = [...rows].sort((a, b) => (ranked[a.change?.priority] ?? 3) - (ranked[b.change?.priority] ?? 3));
  return (
    <section className="my-5 rounded-lg border bg-card p-4 sm:p-6" aria-label="行业竞品与官网修改建议">
      <h2>行业竞品与官网修改建议</h2>
      {industry?.category && <p className="my-2 font-medium">{industry.category} · 收录 {rows.length} 家</p>}
      <p className="text-sm text-muted-foreground">{industry?.note || "当前官网还没有行业检索报告。"}</p>
      {!!industry?.queries?.length && (
        <details className="my-3 text-sm">
          <summary>查看检索范围</summary>
          <ul className="mt-2 list-disc pl-5">{industry.queries.map(q => <li key={q}>{q}</li>)}</ul>
          {industry.at && <time>{new Date(industry.at).toLocaleString("zh-CN")}</time>}
        </details>
      )}
      {sorted.map(({name, segment, url, title, quote, change}) => (
        <article className="mt-4 border-t pt-4 wrap-anywhere" key={name}>
          <h3 className="flex flex-wrap items-center gap-2 font-semibold">
            {name} {change && <Badge variant="secondary">{change.priority}优先级</Badge>}
          </h3>
          <p>{segment}</p>
          <details className="my-2 text-sm">
            <summary>对照依据</summary>
            <blockquote className="my-2 border-l-2 pl-3">{quote}</blockquote>
            <a className="underline" href={url} target="_blank" rel="noreferrer">{title || url}</a>
            {change && <p className="mt-2">本站 · {change.target} · {change.evidence}</p>}
          </details>
          {change ? <dl className="grid gap-2 text-sm">
            <div><dt className="font-semibold">{change.target}的差距</dt><dd>{change.gap}</dd></div>
            <div><dt className="font-semibold">建议修改</dt><dd>{change.action}</dd></div>
            <div><dt className="font-semibold">验收方式</dt><dd>{change.verify}</dd></div>
          </dl> : <p className="text-sm text-muted-foreground">已收录，现有资料不足以提出具体修改。</p>}
        </article>
      ))}
      {onAnalyze && <Button className="mt-3" variant="outline" onClick={onAnalyze}>重新分析官网</Button>}
    </section>
  );
}
