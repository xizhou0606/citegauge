import { BrandQuestions } from "./brand-questions.jsx";
import { Industry } from "./industry.jsx";
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { FileText, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";
import { Metrics, Competitors, Sources } from "./metrics.jsx";
import { MonitorContext } from "./monitor-context.jsx";
import { allSamples, evidenceHash, readEvidenceRoute } from "../core/evidence-route.js";
import { History } from "./history.jsx";
import { Plots } from "../charts/plots.jsx";

const panel = createRoot(document.getElementById("panel"));
let sequence = 0;
function Dashboard({ view, m, report, industry, ready, refresh, onCreate, route }) {
  const [query, setQuery] = useState(route?.query || allSamples);
  const mentions = location.hash === "#competitors?section=mentions";
  function filter(key, value) {
    location.hash = evidenceHash(m.id, report.end, key, value, location.hash);
  }
  return (
    <>
      <MonitorContext {...{m, report, ready, refresh}} overview={view === "monitoring"} />
      {view === "monitoring" && (
        <>
          <Metrics summary={report.summary} filter={filter} />
          <Plots report={report} />
        </>
      )}
      {view === "competitors" && <nav className="view-switch" aria-label="竞品对比视图">
        <a href="#competitors" aria-current={!mentions ? "page" : undefined}>官网同行对标</a>
        <a href="#competitors?section=mentions" aria-current={mentions ? "page" : undefined}>AI 回答中的品牌提及</a>
      </nav>}
      {view === "competitors" && !mentions && <Industry industry={industry} onAnalyze={() => onCreate(m.domain)}
        onExpand={industry?.reviewAt ? async (sources) => {
          await api("site-review", {industryAt: industry.reviewAt, expandIndustry: true, sources});
          await refresh();
        } : undefined} />}
      {view === "competitors" && mentions && <Competitors m={m} report={report} filter={filter} />}
      {view === "sources" && <>
        {m.channel === "通义千问 API" && <BrandQuestions domain={m.domain} />}
        <Sources report={report} filter={filter} />
      </>}
      {view === "evidence" && (
        <section aria-label="复核队列">
          {route?.origin && <p className="evidence-origin"><a href={route.origin.href}>← 返回{route.origin.label}</a></p>}
          <div className="evidence-filters">
            <SmallButton aria-pressed={query.filter === "all"} onClick={() => {location.hash = "evidence"; setQuery(allSamples);}}>全部样本 · {report.summary.total} 份</SmallButton>
            <SmallButton aria-pressed={query.filter === "unreviewed"} onClick={() => filter("unreviewed")}>待人工复核 · {report.summary.valid - report.summary.reviewed} 份</SmallButton>
            <SmallButton aria-pressed={query.filter === "failed"} onClick={() => filter("failed")}>采样失败 · {report.summary.failed} 份</SmallButton>
          </div>
          <History m={m} report={report} query={query} change={setQuery} refresh={refresh} />
        </section>
      )}
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
    const selected = readEvidenceRoute(location.hash);
    const route = selected?.monitor === m.id ? selected : null;
    const [report, comparison] = await Promise.all([
      api("report/" + m.id + (route ? "?end=" + route.end : "")),
      view === "competitors" && location.hash !== "#competitors?section=mentions" ? api("industry/" + m.id) : null,
    ]);
    if (request === sequence)
      panel.render(<Dashboard key={request} {...{ view, m, report, industry: comparison?.industry, route, ready, refresh, onCreate }} />);
  } catch (e) {
    if (request === sequence) panel.render(<p role="alert">{e.message}</p>);
  }
}
