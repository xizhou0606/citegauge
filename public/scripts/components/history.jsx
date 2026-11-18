import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { api } from "../core/api.js";
import { Evidence } from "./evidence.jsx";
import { AsyncButton, Panel, SmallButton } from "./controls.jsx";

function Sample({ row, m, refresh }) {
  const [run, setRun] = useState(null);
  return (
    <article className="sample-row">
      <time>{new Date(row.at).toLocaleString()}</time>
      <Badge variant="secondary">{{ ok: "有效", pending: "采集中", failed: "失败" }[row.state]}</Badge>
      <AsyncButton
        variant="link"
        data-run={row.id}
        aria-expanded={!!run}
        run={async () => setRun(run ? null : await api("evidence/" + row.id + "?view=answer"))}
      >
        阅读回答
      </AsyncButton>
      {run && (
        <div className="sample-detail">
          <Evidence run={run} m={m} refresh={refresh} />
        </div>
      )}
    </article>
  );
}
export function History({ m, report, query, change, refresh }) {
  const [result, setResult] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    setResult(null);
    setError("");
    const { filter, value, offset } = query;
    const params = new URLSearchParams({ filter, value, offset, end: report.end });
    api("history/" + m.id + "?" + params)
      .then((data) => {
        if (current) setResult(data);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [m.id, report.end, query]);
  return (
    <Panel className="history">
      <div className="section-head">
        <h2 id="history-title">样本历史 · {query.label}</h2>
        <SmallButton onClick={() => change()}>查看全部样本</SmallButton>
      </div>
      <div id="history">
        {error ? (
          <p role="alert">{error}</p>
        ) : !result ? (
          <p role="status">正在读取样本…</p>
        ) : (
          <>
            {result.rows.map((row) => (
              <Sample key={row.id} row={row} m={m} refresh={refresh} />
            ))}
            {!result.rows.length && <p className="empty">当前筛选没有样本。</p>}
            {query.offset > 0 && (
              <SmallButton onClick={() => change({ ...query, offset: query.offset - 25 })}>
                上一页
              </SmallButton>
            )}
            {result.more && (
              <SmallButton onClick={() => change({ ...query, offset: query.offset + 25 })}>
                下一页
              </SmallButton>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
