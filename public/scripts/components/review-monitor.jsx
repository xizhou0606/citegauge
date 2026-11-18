import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, AsyncButton } from "./controls.jsx";

export function Monitor({ report, actions }) {
  const m = report.monitor;
  const [note, setNote] = useState("");
  useEffect(() => {
    let current = true,
      timer;
    if (!m) return;
    async function poll(attempt) {
      try {
        const { state } = await api("initial-sample/" + encodeURIComponent(m.id));
        if (!current) return;
        setNote(
          {
            ok: "首次采样已完成",
            failed: "首次采样失败，可进入监测结果查看原因并重试",
            pending: "千问正在回答监测问题…",
            queued: "首次采样已排队",
          }[state],
        );
        if (state === "ok" || state === "failed") {
          if (attempt > 0) await actions.settled(m.id);
        } else if (attempt < 17) timer = setTimeout(() => poll(attempt + 1), 4000);
      } catch {
        if (current) setNote("可在监测结果中查看采样状态");
      }
    }
    poll(0);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [m, actions]);
  if (!m)
    return (
      m === null && (
        <p className="surface">页面中缺少可核对的品牌名称。可以提交含品牌介绍的官网页面继续分析。</p>
      )
    );
  return (
    <Panel className="report-monitor">
      <h3>品牌监测</h3>
      <p>{m.question}</p>
      {report.identity?.brand === m.brand && <small>品牌识别依据 · {report.identity.evidence}</small>}
      {!!m.aliases.length && <small>品牌别名 · {m.aliases.join("、")}</small>}
      {!!m.rivals.length && <small>官网提到的竞品 · {m.rivals.join("、")}</small>}
      <AsyncButton id="open-site-monitor" run={() => actions.open(m.id)}>
        查看监测结果
      </AsyncButton>
      <small role="status">{note}</small>
    </Panel>
  );
}
