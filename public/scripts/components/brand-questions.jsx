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
    <p className="caption">官网依据 · {row.section} · {row.quote}</p>
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
    <h2>品牌提问与官网引用率</h2>
    <p className="caption">{domain} · 通义千问 qwen-plus 联网提问 · 最近 30 天</p>
    {data?.rows?.length ? <>
      {["官网定向","同类选型"].map(mode => {
        const rows = data.rows.filter(r => r.mode === mode);
        const sum = key => rows.reduce((total,row) => total + row[key],0);
        return <section className="mt-6 border-t pt-4" key={mode}>
          <h3>{mode} · {rows.length} 道</h3>
          <p>{mode === "官网定向" ? "问题给出品牌和网址，衡量回答引用官网的频率。" : "问题保留官网描述的使用场景，衡量未点名时官网被引用的频率。"}</p>
          <strong className="probe-rate">{percent(sum("citations"),sum("observable"))}</strong>
          <p>官网被引 {sum("citations")} 份 / 可判定 {sum("observable")} 份 · 来源不可判定 {sum("valid")-sum("observable")} 份</p>
          <ol>{rows.map(row => <Question key={row.id + (row.sample || "")} row={row} reload={reload} />)}</ol>
        </section>;
      })}
    </> : null}
    {(busy || data?.queued) && missing > 0 && <p role="status">正在根据官网模块生成 {missing} 道问题并安排提问…</p>}
    {error && <p role="alert">{error} <SmallButton onClick={reload}>重试</SmallButton></p>}
  </Panel>;
}
