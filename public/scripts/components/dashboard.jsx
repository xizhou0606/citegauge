import { Industry } from "./industry.jsx";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarDays, FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";
import { Metrics, Competitors, Sources } from "./metrics.jsx";
import { Sampling } from "./sampling.jsx";
import { ReportActions } from "./report-actions.jsx";
import { History } from "./history.jsx";
import { Plots } from "../charts/plots.jsx";

const panel = createRoot(document.getElementById("panel"));
const all = { filter: "all", value: "", label: "全部样本", offset: 0 };
let sequence = 0;
function Dashboard({ view, m, report, industry, ready, refresh, onCreate }) {
  const [query, setQuery] = useState(all);
  const date = (t) => new Date(t).toISOString().slice(0, 10);
  function filter(filter, value, label) {
    setQuery({ filter, value, label, offset: 0 });
    document.getElementById("history-title")?.scrollIntoView({ block: "nearest" });
  }
  return (
    <>
      <section className="monitor-head">
        <div>
          <p className="brand-domain">
            {m.brand} · {m.domain}
            {m.model && " · " + m.model}
          </p>
          <h2>{m.question}</h2>
          <div className="date-range">
            <CalendarDays size={15} />
            {date(report.start)} — {date(report.end)} · UTC
          </div>
        </div>
        <div className="sampling-actions">
          <Sampling m={m} ready={ready} refresh={refresh} />
          <ReportActions m={m} report={report} />
        </div>
      </section>
      {view === "monitoring" && (
        <>
          <Metrics summary={report.summary} filter={filter} />
          <Plots report={report} />
        </>
      )}
      {view === "competitors" && <Industry industry={industry} onAnalyze={() => onCreate(m.domain)}
        onExpand={industry?.reviewAt ? async (sources) => {
          await api("site-review", {industryAt: industry.reviewAt, expandIndustry: true, sources});
          await refresh();
        } : undefined} />}
      {view === "competitors" && <Competitors m={m} report={report} filter={filter} />}
      {view === "sources" && <Sources report={report} filter={filter} />}
      {view === "evidence" && (
        <SmallButton onClick={() => filter("unreviewed", "", "待人工复核")}>
          待人工复核 · {report.summary.valid - report.summary.reviewed} 份
        </SmallButton>
      )}
      <History m={m} report={report} query={query} change={(q = all) => setQuery(q)} refresh={refresh} />
    </>
  );
}
function EmptyMonitor({ create }) {
  return (
    <Panel className="empty-platform">
      <div>
        <h2>从官网创建监测项</h2>
        <p>输入官网网址，AI 会识别品牌、生成监测问题，并用千问完成首次采样。</p>
        <Button id="first-monitor" onClick={() => create()}>
          <Plus />
          新建监测项
        </Button>
      </div>
      <aside className="question-example">
        <span>
          <FileText className="inline size-4" /> 监测问题示例
        </span>
        <blockquote>小团队如何管理客户跟进？</blockquote>
      </aside>
    </Panel>
  );
}
export async function renderDashboard(view, m, ready, refresh, onCreate) {
  const request = ++sequence;
  if (view === "website") return panel.render(null);
  if (!m) return panel.render(<EmptyMonitor create={onCreate} />);
  panel.render(
    <p className="empty" role="status">
      正在读取样本…
    </p>,
  );
  try {
    const [report, comparison] = await Promise.all([
      api("report/" + m.id),
      view === "competitors" ? api("industry/" + m.id) : null,
    ]);
    if (request === sequence)
      panel.render(<Dashboard key={request} {...{ view, m, report, industry: comparison?.industry, ready, refresh, onCreate }} />);
  } catch (e) {
    if (request === sequence) panel.render(<p role="alert">{e.message}</p>);
  }
}
