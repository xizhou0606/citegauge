import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { status } from "../core/ui.js";
import { AsyncButton, Disclosure, Panel, SmallButton } from "./controls.jsx";
import { downloadMarkdown, moduleFields, reviewDocument } from "./review-export.js";

function Monitor({ report, actions }) {
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
    <Panel className="site-summary">
      <h2>{m.brand} · 品牌监测</h2>
      {report.identity?.brand === m.brand && <small>品牌识别依据 · {report.identity.evidence}</small>}
      {!!m.aliases.length && <small>品牌别名 · {m.aliases.join("、")}</small>}
      {!!m.rivals.length && <small>官网提到的竞品 · {m.rivals.join("、")}</small>}
      <p>{m.question}</p>
      <AsyncButton id="open-site-monitor" run={() => actions.open(m.id)}>
        查看监测结果
      </AsyncButton>
      <small role="status">{note}</small>
    </Panel>
  );
}
export function SiteReport({ report, actions }) {
  const host = new URL(report.url).hostname;
  async function copy(modules) {
    await navigator.clipboard.writeText(reviewDocument(report, true, modules));
    status("已复制修改提示词");
  }
  return (
    <>
      <Panel className="site-summary">
        <h2>官网整体形象</h2>
        <p>{report.impression}</p>
        <a href={report.url} target="_blank" rel="noreferrer">
          {report.title || report.url} ↗
        </a>
        <small>
          {host} · {new Date(report.at).toLocaleString()}
        </small>
        <div className="flex flex-wrap gap-2 mt-3">
          <SmallButton onClick={() => downloadMarkdown(host + "-官网报告.md", reviewDocument(report))}>
            导出完整报告
          </SmallButton>
          <SmallButton
            onClick={() => downloadMarkdown(host + "-AI修改提示词.md", reviewDocument(report, true))}
          >
            导出 AI 修改提示词
          </SmallButton>
          <AsyncButton run={() => copy(report.modules)}>复制全部提示词</AsyncButton>
        </div>
        <Disclosure title="查看首屏截图">
          <img
            alt="分析时抓取的官网首屏"
            width="1280"
            height="960"
            src={"data:image/jpeg;base64," + report.screenshot}
          />
        </Disclosure>
      </Panel>
      <Monitor report={report} actions={actions} />
      <h2 className="module-heading">按模块修改</h2>
      {report.modules.map((m, i) => (
        <Panel className="site-module" key={i}>
          <h3>{m.name}</h3>
          <blockquote>
            <strong>{m.source === "截图" ? "首屏观察" : "页面原文"}</strong> {m.evidence}
          </blockquote>
          <dl>
            {moduleFields
              .filter(([key]) => m[key])
              .map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{m[key]}</dd>
                </div>
              ))}
          </dl>
          <AsyncButton className="self-start mt-3" run={() => copy([m])}>
            复制本模块修改提示词
          </AsyncButton>
        </Panel>
      ))}
    </>
  );
}
