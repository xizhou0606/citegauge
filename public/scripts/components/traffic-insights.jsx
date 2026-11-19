import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";

import { TrafficReports } from "./traffic-reports.jsx";

export function TrafficInsights({monitor}) {
  const [days,setDays]=useState(7);
  const [selection,setSelection]=useState({index:0,metric:"channel"});
  const [version,setVersion]=useState(0);
  const [data,setData]=useState(null);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    setData(null);setError("");
    api("site-sdk?analysis=1&days="+days+"&monitor="+encodeURIComponent(monitor.id))
      .then(r=>{if(active) setData(r);}).catch(e=>{if(active) setError(e.message);});
    return ()=>{active=false;};
  },[monitor.id,days,version]);
  return <div className="grid gap-4">
    <Panel className="grid gap-3 p-5">
      <header className="traffic-toolbar"><h2>{monitor.domain} · 访问分析</h2>
        <SmallButton onClick={()=>setVersion(v=>v+1)}>刷新分析</SmallButton></header>
      <div className="traffic-toolbar"><div className="traffic-period" role="group" aria-label="分析时间范围">
        {[[1,"今天"],[7,"近 7 天"],[30,"近 30 天"]].map(([n,label])=><SmallButton key={n}
          aria-pressed={days===n} onClick={()=>setDays(n)}>{label}</SmallButton>)}</div><small>北京时间</small></div>
      {data && <small className="report-receipt">{data.lastDetail
        ? "本期最近一次细分上报 · "+new Date(data.lastDetail).toLocaleString("zh-CN",{timeZone:"Asia/Shanghai",hour12:false})
        : "本期还没有细分上报。请在 SDK 接入中确认站点已启用采集，并核对线上使用的 citegauge.ts 配置。"}
        {" "}<a href="#traffic?section=sdk">查看 SDK 接入</a></small>}
      {error && <p role="alert">{error}</p>}
      {!error && !data && <p role="status">正在读取访问分析…</p>}
    </Panel>
    {data && <>
      <dl className="report-summary">{[
        ["期间首次观测访客",data.visitors.visitors-data.visitors.returningVisitors,"人"],
        ["期间开始前来访过",data.visitors.returningVisitors,"人"],
        ["新增标签页会话",data.groups.find(r=>r.kind==="session")?.denominator,"次"],
        ["控件点击",data.groups.find(r=>r.kind==="click")?.denominator,"次"],
      ].map(([label,total,unit])=><div key={label}><dt>{label}</dt><dd>{total==null ? "—" : total.toLocaleString()}
        <small>{total==null ? "待采样" : unit}</small></dd></div>)}</dl>
      <TrafficReports data={data} selection={selection} onSelect={setSelection}/>
    </>}
  </div>;
}
