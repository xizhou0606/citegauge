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
  async function show() {
    if (answer) { setAnswer(null); return; }
    try { setAnswer(await api("evidence/"+encodeURIComponent(row.sample)+"?view=answer")); setError(""); }
    catch (e) {setError(e.message);}
  }
  const pending = ["queued","pending"].includes(row.state);
  return <li className="brand-probe">
    <header><strong>{row.intent}</strong><span>{percent(row.citations,row.observable)} · 官网被引 {row.citations} / 可判定 {row.observable}</span></header>
    <p>{row.question}</p>
    <div className="probe-actions">
      {row.sample && !pending && <SmallButton aria-expanded={!!answer} onClick={show}>{answer ? "收起回答" : "阅读最近回答"}</SmallButton>}
      <SmallButton disabled={busy || pending} onClick={ask}>{busy || pending ? "正在提问…" : "再问一次"}</SmallButton>
      <small>{{queued:"已排队",pending:"采集中",failed:"最近采样失败",empty:"近 30 天没有回答"}[row.state]}</small>
    </div>
    {answer && <div className="probe-answer">
      {answer.state === "ok" ? <FormattedAnswer detail={answer.detail} /> : <p>{answer.detail.error || "尚未取得回答"}</p>}
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
        if (result.canStartAt && result.rows.length < result.targetCount && !attempted) {
          attempted = true;
          setBusy(true);
          await api("site-review",{questionsAt:result.canStartAt});
          if (active) await read();
          return;
        }
        if (result.rows?.some(r => ["queued","pending"].includes(r.state))) timer = setTimeout(read,4000);
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setBusy(false); }
    }
    read();
    return () => {active=false; clearTimeout(timer);};
  },[domain,at,version]);
  if (!data?.rows?.length && !data?.canStartAt && !error) return null;
  const t = data?.totals;
  const missing = data?.targetCount - (data?.rows?.length || 0);
  return <Panel className="brand-questions">
    <h2>品牌提问与官网引用率</h2>
    <p className="caption">{domain} · 通义千问 qwen-plus 联网提问 · 最近 30 天</p>
    {data?.rows?.length ? <>
      <strong className="probe-rate">{percent(t.citations,t.observable)}</strong>
      <p>官网被引 {t.citations} 份 / 可判定 {t.observable} 份 · 另有 {t.valid-t.observable} 份有效回答来源不可判定</p>
      <p>共 {data.rows.length} 道品牌问题</p>
      {busy && missing > 0 && <p role="status">正在补充 {missing} 道问题并安排首次提问…</p>}
      <ol>{data.rows.map(row => <Question key={row.id + (row.sample || "")} row={row} reload={reload} />)}</ol>
    </> : busy && <p role="status">正在根据官网定位生成 {data?.targetCount} 道问题并安排首次提问…</p>}
    {error && <p role="alert">{error} <SmallButton onClick={reload}>重试</SmallButton></p>}
  </Panel>;
}
