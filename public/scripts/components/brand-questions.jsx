import { FormattedAnswer } from "./formatted-answer.jsx";
import { useEffect, useRef, useState } from "react";
import { api } from "../core/api.js";
import { percent } from "../core/ui.js";
import { Panel, SmallButton } from "./controls.jsx";

function Question({row, reload}) {
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pendingKey = useRef(null);
  async function ask() {
    setBusy(true);
    setError("");
    try {
      pendingKey.current ??= crypto.randomUUID();
      await api("sample",{monitor:row.id,key:pendingKey.current});
      pendingKey.current = null;
      setAnswer(null);
      reload();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  async function show(sample) {
    if (answer?.id === sample) { setAnswer(null); return; }
    try { setAnswer(await api("evidence/"+encodeURIComponent(sample)+"?view=answer")); setError(""); }
    catch (e) {setError(e.message);}
  }
  const pending = ["queued","pending"].includes(row.state);
  return <li className="brand-probe">
    <header><strong>{row.intent}</strong><span>{percent(row.citations,row.observable)} · 官网被引 {row.citations} / 可判定 {row.observable}</span></header>
    <p>{row.question}</p>
    <details className="caption"><summary>出题依据 · {row.section}</summary><p>{row.quote}</p></details>
    <div className="probe-actions">
      {row.sample && !pending && <SmallButton aria-expanded={answer?.id === row.sample} onClick={() => show(row.sample)}>{answer?.id === row.sample ? "收起回答" : "阅读最近回答"}</SmallButton>}
      {row.previousSample && <SmallButton aria-expanded={answer?.id === row.previousSample} onClick={() => show(row.previousSample)}>
        {answer?.id === row.previousSample ? "收起历史回答" : "查看换模型前的回答"}
      </SmallButton>}
      <SmallButton disabled={busy || pending} onClick={ask}>{busy || pending ? "正在提问…" : "再问一次"}</SmallButton>
      <small>{{queued:"已排队",pending:"采集中",failed:"最近采样失败",empty:"近 30 天没有回答"}[row.state]}</small>
    </div>
    {answer && <div className="probe-answer">
      {answer.detail?.model && <p className="caption">回答模型 · {answer.detail.model}</p>}
      {answer.state === "ok" ? <FormattedAnswer detail={answer.detail} /> : <p>{answer.detail?.error || "尚未取得回答"}</p>}
    </div>}
    {error && <p role="alert">{error}</p>}
  </li>;
}

export function BrandQuestions({domain, at}) {
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  const [busy,setBusy] = useState(false);
  const [version,setVersion] = useState(0);
  function reload() { setVersion(v => v+1); }
  useEffect(() => {
    let active = true, timer;
    const params = new URLSearchParams({domain});
    if (at) params.set("at",at);
    let attempted = false;
    async function read() {
      try {
        const result = await api("brand-questions?"+params);
        if (!active) return;
        setData(result);setError("");
        if (result.failed && attempted) throw Error("生成未完成，点击重试可重新按官网依据出题。");
        if (result.canStartAt && result.rows.length < result.targetCount && !attempted) {
          attempted = true;
          setBusy(true);
          await api("site-review",{domain,questionsAt:result.canStartAt});
          if (active) await read();
          return;
        }
        if (attempted && result.rows.length === result.targetCount) {
          attempted = false;
          window.dispatchEvent(new CustomEvent("site-questions-ready",{detail:domain}));
        }
        if (result.queued || result.rows?.some(r => ["queued","pending"].includes(r.state))) timer = setTimeout(read,4000);
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setBusy(false); }
    }
    read();
    return () => {active=false; clearTimeout(timer);};
  },[domain,at,version]);
  if (!data?.rows?.length && !data?.canStartAt && !error) return null;
  const missing = data?.targetCount - (data?.rows?.length || 0);
  return <Panel className="brand-questions">
    <h2>客户搜索问题与官网引用率</h2>
    <p className="caption">{domain} · 通义千问 {data?.model} 联网提问 · 最近 30 天</p>
    {data?.rows?.length ? <>
      <p>{data.rows.length} 道客户选型问题。每题请 AI 按该场景的适配程度列出具体平台和推荐理由。</p>
      <strong className="probe-rate">{percent(data.totals.citations,data.totals.observable)}</strong>
      <p>官网被引 {data.totals.citations} 份 / 可判定 {data.totals.observable} 份 · 来源不可判定 {data.totals.valid-data.totals.observable} 份</p>
      <ol>{data.rows.map(row => <Question key={row.id + (row.sample || "")} row={row} reload={reload} />)}</ol>
    </> : null}
    {(busy || data?.queued) && missing > 0 && <p role="status">正在根据官网模块生成 {missing} 道问题并安排提问…</p>}
    {error && <p role="alert">{error} <SmallButton onClick={reload}>重试</SmallButton></p>}
  </Panel>;
}
