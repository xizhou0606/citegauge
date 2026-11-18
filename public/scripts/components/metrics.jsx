import { Activity, Link2, CircleCheck, CircleAlert } from "lucide-react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { percent } from "../core/ui.js";
import { Panel, SmallButton, DataTable } from "./controls.jsx";

export function Metrics({ summary: c, filter }) {
  const metrics = [
    [
      "mentions",
      "品牌提及率",
      percent(c.mentions, c.valid),
      c.mentions + " / " + c.valid + " 有效回答",
      Activity,
    ],
    [
      "citations",
      "官网引用率",
      percent(c.citations, c.observable),
      c.citations + " / " + c.observable + " 可判定回答",
      Link2,
    ],
    [
      "recommended",
      "明确推荐率",
      percent(c.recommended, c.reviewed),
      c.reviewed ? c.recommended + " / " + c.reviewed + " 已复核" : "尚无已复核回答",
      CircleCheck,
    ],
    ["failed", "失败样本", c.failed, "共 " + c.total + " 次采样 · 待完成 " + c.pending, CircleAlert],
  ];
  return (
    <div className="kpi-grid">
      {metrics.map(([key, label, value, note, Icon], i) => (
        <Button
          key={key}
          variant="outline"
          className={"kpi surface block h-auto whitespace-normal k" + i}
          aria-label={label + " " + note + "，查看样本"}
          onClick={() => filter(key, "", label)}
        >
          <span className="kpi-title">
            <i>
              <Icon />
            </i>
            {label}
          </span>
          <strong>{value}</strong>
          <small>{note}</small>
        </Button>
      ))}
    </div>
  );
}
export function Competitors({ m, report, filter }) {
  const items = [
    { name: m.brand, hits: report.summary.mentions, kind: "mentions" },
    ...report.rivals.map((r) => ({ ...r, kind: "rival" })),
  ];
  items.sort((a, b) => b.hits - a.hits);
  const total = items.reduce((n, r) => n + r.hits, 0);
  return (
    <Panel>
      <h2>品牌与竞品提及</h2>
      <p className="caption my-2">每份有效回答中，同一品牌计一次。提及份额按表内所有品牌的提及总数计算。</p>
      <DataTable headings={["品牌", "提及 / 有效回答", "提及率", "提及份额"]}>
        {items.map((r) => (
          <TableRow key={r.kind + r.name}>
            <TableCell>
              <SmallButton variant="link" onClick={() => filter(r.kind, r.name, r.name)}>
                {r.name}
              </SmallButton>
            </TableCell>
            <TableCell>
              {r.hits} / {report.summary.valid}
            </TableCell>
            <TableCell>{percent(r.hits, report.summary.valid)}</TableCell>
            <TableCell>{percent(r.hits, total)}</TableCell>
          </TableRow>
        ))}
      </DataTable>
      <SmallButton className="mt-3 self-start" onClick={() => filter("competitorGap", "", "仅提及竞品")}>
        仅提及竞品的回答 · {report.summary.competitorGaps} 份
      </SmallButton>
    </Panel>
  );
}
export function Sources({ report, filter }) {
  const {valid, observable, citations} = report.summary;
  return (<>
    <section className="citation-status" aria-labelledby="citation-status-title">
      <h2 id="citation-status-title">官网引用情况</h2>
      <div>{[["引用官网", citations, "citations"], ["已核对无官网", observable - citations, "noCitation"],
        ["来源不可观测", valid - observable, "unknownCitation"]].map(([label, count, key]) =>
        <button type="button" key={key} onClick={() => filter(key, "")} aria-label={label + "，查看 " + count + " 份回答"}>
          <span>{label}</span><strong>{count} <small>份回答</small></strong>
        </button>
      )}</div>
    </section>
    <div className="plot-grid">
      {[
        ["最常引用的页面", "source", report.sources],
        ["官网未被引用时的来源页", "gapSource", report.gapSources],
      ].map(([title, key, rows]) => (
        <Panel key={key}>
          <h2>{title} · 前 20</h2>
          <div className="source-list">
            {rows.map((r, i) => (
              <SmallButton
                key={r.name}
                variant="ghost"
                className="source-row h-auto whitespace-normal"
                onClick={() => filter(key, r.name, r.name)}
              >
                <small>{i + 1}</small>
                <span>{r.name}</span>
                <b>{r.hits} 份回答</b>
              </SmallButton>
            ))}
            {!rows.length && <p className="empty">{key === "source" ? "这些回答尚未记录可列出的引用网址。" : "已核对且未引用官网的回答中，尚未记录其他来源网址。"}</p>}
          </div>
        </Panel>
      ))}
    </div></>
  );
}
