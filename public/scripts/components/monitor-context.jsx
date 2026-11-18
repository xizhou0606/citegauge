import { CalendarDays } from "lucide-react";
import { Sampling } from "./sampling.jsx";
import { ReportActions } from "./report-actions.jsx";

export function MonitorContext({ m, report, ready, refresh, overview }) {
  const date = t => new Date(t).toISOString().slice(0, 10);
  const period = date(report.start) + " — " + date(report.end) + " · UTC";
  if (!overview) return <details className="monitor-context">
    <summary>{m.brand} · 监测范围与问题</summary>
    <p>{m.question}</p><small>{m.domain} · {m.channel} · {period}</small>
  </details>;
  return <section className="monitor-head">
    <div><p className="brand-domain">{m.brand} · {m.domain}{m.model && " · " + m.model}</p>
      <h2>{m.question}</h2><div className="date-range"><CalendarDays size={15} />{period}</div>
    </div>
    <div className="sampling-actions">
      <Sampling m={m} ready={ready} refresh={refresh} /><ReportActions m={m} report={report} />
    </div>
  </section>;
}
