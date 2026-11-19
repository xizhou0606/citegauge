import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";

const sections=[
  ["来源与推广",{referrer:"引荐域名",channel:"引荐渠道",utm_source:"推广来源",utm_medium:"推广媒介",utm_campaign:"推广活动"}],
  ["页面与受众",{page:"页面分组",session:"新增标签页会话",country:"国家或地区",device:"设备类型",
    browser:"浏览器",os:"操作系统",language:"浏览器语言",screen:"视口宽度"}],
  ["互动与转化",{engagement:"累计前台可见时间",scroll:"达到滚动深度",outbound:"外链点击",
    download:"下载点击",form:"表单提交",search:"搜索结果浏览",custom:"自定义业务事件",error:"前端错误"}],
];
const deviceNames={desktop:"电脑",phone:"手机",tablet:"平板",unknown:"未识别"};
const regionNames = new Intl.DisplayNames(["zh-CN"],{type:"region"});
function labelFor(row) {
  if (row.kind==="country" && /^[A-Z]{2}$/.test(row.label)) return regionNames.of(row.label);
  if (row.kind==="device") return deviceNames[row.label] ?? row.label;
  return row.label;
}

export function TrafficInsights({monitor}) {
  const [days,setDays]=useState(7);
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
      {error && <p role="alert">{error}</p>}
      {!error && !data && <p role="status">正在读取访问分析…</p>}
      {data && !data.groups.length && !data.vitals.length && <p>此时段尚无细分事件。网站部署新版 SDK 后，已开启的维度将在发生对应访问时显示。 <a href="/docs/sdk/collection.html">查看采集开关</a></p>}
    </Panel>
    {data?.visitors?.visitors>0 && <Panel className="grid gap-3 p-5"><h2>新访客与回访访客</h2>
      <dl className="traffic-kpis"><div><dt>期间首次观测</dt><dd>{data.visitors.visitors-data.visitors.returningVisitors}</dd></div>
        <div><dt>曾在期间开始前访问</dt><dd>{data.visitors.returningVisitors}</dd></div></dl>
      <p>按本站浏览器匿名标识去重，清除浏览器存储后会产生新的标识。</p></Panel>}
    {data && sections.map(([heading,names])=>{
      const keys=Object.keys(names).filter(k=>data.groups.some(row=>row.kind===k));
      if (!keys.length) return null;
      return <Panel className="grid gap-3 p-5" key={heading}><h2>{heading}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{keys.map(k=>
          <section className="traffic-source" key={k}><h3>{names[k]}</h3>
            <dl className="traffic-frequency">{data.groups.filter(r=>r.kind===k).map(row=>
              <div key={row.label}><dt className="break-all">{labelFor(row)}</dt>
                <dd>{k==="engagement" ? (row.total/1000).toLocaleString("zh-CN",{maximumFractionDigits:1})+" 秒" :
                  row.samples.toLocaleString()+" 次"}</dd></div>)}</dl></section>)}</div>
      </Panel>;
    })}
    {!!data?.vitals.length && <Panel className="grid gap-3 p-5"><h2>真实用户性能 · P75</h2>
      <p>75% 的有效样本不高于该值，仅统计浏览器实际报告的测量。</p>
      <dl className="traffic-kpis">{data.vitals.map(r=><div key={r.kind}><dt>{r.kind}</dt>
        <dd>{r.kind==="CLS" ? r.p75.toFixed(3) : Math.round(r.p75)+" ms"}</dd><small>{r.samples} 个样本</small></div>)}</dl>
    </Panel>}
  </div>;
}
