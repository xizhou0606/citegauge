import { api } from "../core/api.js";
import { downloadMarkdown } from "./review-export.js";

export async function exportSamples(m, report) {
  const date = new Date(report.end).toISOString().slice(0, 10);
  const c = report.summary;
  const lines = [
    `# ${m.brand} · ${m.channel}`,
    m.question,
    m.domain,
    m.model || "网页采样",
    `${new Date(report.start).toISOString()} — ${new Date(report.end).toISOString()}`,
    `有效回答 ${c.valid} / ${c.total} · 失败 ${c.failed} · 待完成 ${c.pending}`,
    `品牌提及 ${c.mentions} / ${c.valid} · 官网引用 ${c.citations} / ${c.observable} · 明确推荐 ${c.recommended} / ${c.reviewed}`,
    ...report.days.map(
      (d) => `${d.day} · 有效 ${d.valid} · 提及 ${d.mentions} · 引用 ${d.citations} · 推荐 ${d.recommended}`,
    ),
    ...report.rivals.map((x) => `竞品 · ${x.name} · ${x.hits} 份回答`),
    ...report.sources.map((x) => `引用来源 · ${x.name} · ${x.hits} 份回答`),
  ];
  for (let offset = 0; ; offset += 25) {
    const page = await api("history/" + m.id + "?format=markdown&end=" + report.end + "&offset=" + offset);
    for (const row of page.rows) {
      const d = row.detail;
      lines.push(
        "## " + new Date(row.at).toISOString(),
        { ok: "有效", failed: "失败", pending: "采集中" }[row.state],
      );
      if (row.state === "ok") {
        lines.push(d.answer, "引用来源", d.urls?.join("\n") || (d.urls ? "已核对，未见引用" : "不可观测"));
        if (d.page) lines.push(d.page);
        if (d.review)
          lines.push("人工复核 · " + (d.review.recommended ? "明确推荐" : "未明确推荐"), d.review.quote);
      }
    }
    if (!page.more) break;
  }
  downloadMarkdown(m.domain + "-" + date + "-完整监测报告.md", lines.filter(Boolean).join("\n\n"));
}
