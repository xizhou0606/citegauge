import { SmallButton } from "./controls.jsx";

const files = [["files", "XML + TXT"], ["xml", "XML"], ["txt", "TXT"]];

export function fileTotals(rows) {
  const totals = {
    files: { requests: 0, ai: 0 },
    xml: { requests: 0, ai: 0 },
    txt: { requests: 0, ai: 0 },
  };
  for (const row of rows) {
    totals[row.kind] = row;
    totals.files.requests += row.requests;
    totals.files.ai += row.ai;
  }
  return totals;
}

export function CrawlerFiles({ totals, hasData, detail, select }) {
  return <section className="grid gap-3" aria-label="全渠道文件请求统计">
    <h3>全渠道文件请求</h3>
    <p>按官网汇总 SDK 和导入日志中的请求，包含所有 HTTP 状态。XML 含 .xml.gz，TXT 含 robots.txt 和其他 .txt 文件。</p>
    <div className="grid gap-3 sm:grid-cols-3">
      {files.map(([key, label]) => <div key={key} className="rounded-lg border p-3">
        <p>{label}</p>
        <strong className="block text-2xl">{hasData ? totals[key].requests.toLocaleString() : "—"}</strong>
        <p>其中带 AI 爬虫标识：{hasData ? totals[key].ai.toLocaleString() : "—"}</p>
      </div>)}
    </div>
    <p>请导入完整、未采样的官网请求日志。历史导入只保留了已识别爬虫，可重新导入原日志补齐其他来源。</p>
    <nav className="flex flex-wrap gap-2" aria-label="请求明细范围">
      {[...files, ["bots", "AI 爬虫（所有路径）"]].map(([key, label]) =>
        <SmallButton key={key} aria-pressed={detail === key} onClick={() => select(key)}>{label}</SmallButton>)}
    </nav>
  </section>;
}
