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
      {row.sample && !pending && <SmallButton aria-expanded={!!answer} onClick={show}>{answer ? "收起记录" : "查看最近记录"}</SmallButton>}
      <SmallButton disabled={busy || pending} onClick={ask}>{busy || pending ? "正在提问…" : "再问一次"}</SmallButton>
      <small>{{queued:"已排队",pending:"采集中",failed:"最近采样失败",empty:"近 30 天没有回答"}[row.state]}</small>
    </div>
    {answer && <div className="probe-answer">
      {answer.state === "ok" ? <><strong>千问回答原文</strong><p>{answer.detail.answer}</p>
        <strong>正文引用的网址</strong>
        {answer.detail.urls?.length ? <ul>{answer.detail.urls.map(u => <li key={u}><a href={u} target="_blank" rel="noreferrer">{u}</a></li>)}</ul>
          : <p>{answer.detail.urls === null ? "本条来源无法判定" : "正文未标注来源"}</p>}</> : <p>{answer.detail.error || "尚未取得回答"}</p>}
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
    async function read() {
      try {
        const result = await api("brand-questions?"+params);
        if (!active) return;
        setData(result);setError("");
        if (result.rows?.some(r => ["queued","pending"].includes(r.state))) timer = setTimeout(read,4000);
      } catch (e) { if (active) setError(e.message); }
    }
    read();
    return () => {active=false; clearTimeout(timer);};
  },[domain,at,version]);
  async function start() {
    setError("");setBusy(true);
    try {await api("site-review",{questionsAt:data.canStartAt});reload();}
    catch (e) {setError(e.message);}
    finally {setBusy(false);}
  }
  if (!data?.rows?.length && !data?.canStartAt && !error) return null;
  const t = data?.totals;
  return <Panel className="brand-questions">
    <h2>品牌提问与官网引用率</h2>
    <p className="caption">{domain} · 通义千问 qwen-plus 联网提问 · 最近 30 天</p>
    {data?.rows?.length ? <>
      <strong className="probe-rate">{percent(t.citations,t.observable)}</strong>
      <p>官网被引 {t.citations} 份 / 可判定 {t.observable} 份 · 另有 {t.valid-t.observable} 份有效回答来源不可判定</p>
      <ol>{data.rows.map(row => <Question key={row.id + (row.sample || "")} row={row} reload={reload} />)}</ol>
    </> : data?.canStartAt && <><p>根据官网定位和受众生成三条问题，依次询问千问，核对回答正文引用的网址。</p>
      <SmallButton disabled={busy} onClick={start}>{busy ? "正在生成问题…" : "生成品牌问题并提问"}</SmallButton></>}
    {error && <p role="alert">{error} <SmallButton onClick={reload}>刷新统计</SmallButton></p>}
  </Panel>;
}
