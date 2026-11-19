import { useEffect, useState } from "react";
import { markdown } from "../core/markdown.js";
import { api } from "../core/api.js";
import { Panel } from "./controls.jsx";

export function FormattedAnswer({detail}) {
  const refs = detail.references || [];
  const other = (detail.urls || []).filter(url => !refs.some(ref => ref.url === url));
  return <div className="formatted-answer">
    <div className="sample-markdown" dangerouslySetInnerHTML={{__html:markdown(detail.answer,refs)}} />
    <footer>{detail.searchedAt && <p>联网检索于 {new Date(detail.searchedAt).toLocaleString("zh-CN")}。网页的更新时间请以来源页为准。</p>}
      <h3>回答引用的网页</h3>
      {refs.map(ref => <p key={ref.index}><a href={ref.url} target="_blank" rel="noreferrer">[{ref.index}] {ref.title}</a></p>)}
      {other.map(url => <p key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></p>)}
      {detail.urls == null && <p>{refs.length ? "部分标记缺少可核对的网址，本条未计入引用率。" : "本条回答的来源无法判定。"}</p>}
      {detail.urls?.length === 0 && !refs.length && <p>已核对，未见引用。</p>}
    </footer>
  </div>;
}

export function CurrentAnswer({sample, question}) {
  const [run,setRun] = useState(null);
  const [error,setError] = useState("");
  useEffect(() => {
    if (!sample) return;
    let active = true;
    api("evidence/"+encodeURIComponent(sample)+"?view=answer")
      .then(value => {if (active) setRun(value);})
      .catch(e => {if (active) setError(e.message);});
    return () => { active = false; };
  },[sample]);
  return <Panel className="current-answer">
    <h2>最近一次有效回答</h2><p className="answer-question">{question}</p>
    {run ? <FormattedAnswer detail={run.detail} /> : <p role="status">{error || (sample ? "正在读取回答…" : "近 30 天还没有有效回答。")}</p>}
  </Panel>;
}
