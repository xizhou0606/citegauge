import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";
import { CrawlerInspection } from "./crawler-inspection.jsx";
import { CrawlerVisits } from "./crawler-visits.jsx";
import { SiteSdk } from "./site-sdk.jsx";

import { TrafficSource } from "./traffic-source.jsx";

const sections = [["overview","流量概览"],["inspect","文件检查"],["sdk","SDK 接入"]];
function TrafficOverview({monitor}) {
  const [days,setDays] = useState(30);
  const [refresh,setRefresh] = useState(0);
  const [stats,setStats] = useState(null);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    setStats(null);
    setError("");
    api("site-sdk?monitor="+encodeURIComponent(monitor.id)+"&days="+days)
      .then(data => { if (active) {setStats(data);setError("");} })
      .catch(e => { if (active) setError(e.message); });
    return () => { active=false; };
  },[monitor.id,refresh,days]);
  const sources = [
    ...(stats?.browser?.enabled ? [["浏览器页面访问",stats.browser]] : []),
    ...(!stats?.browser?.enabled || stats?.lastSeen ? [["服务端页面请求",stats]] : []),
  ];
  return <>
    <Panel className="grid gap-3 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2>{monitor.domain} · 页面访问</h2><SmallButton onClick={()=>setRefresh(n=>n+1)}>刷新统计</SmallButton>
      </header>
      <div className="traffic-toolbar">
        <div className="traffic-period" role="group" aria-label="访问统计时间范围">
          {[[1,"今天"],[7,"近 7 天"],[30,"近 30 天"]].map(([n,label])=><SmallButton key={n}
            aria-pressed={days===n} onClick={()=>setDays(n)}>{label}</SmallButton>)}
        </div><small>北京时间 · UV 按所选期间去重</small>
      </div>
      {error && <p role="alert">{error}</p>}
      {!stats && !error && <p role="status">正在读取流量…</p>}
      {stats && sources.map(([title,data])=><TrafficSource key={title} title={title} data={data} days={stats.days ?? days}/>)}
      {stats?.browser?.enabled && <p>浏览器统计页面加载与站内路径切换。AI 爬虫和 XML、TXT 请求由服务端或访问日志统计。</p>}
    </Panel>
    <CrawlerVisits key={refresh} monitor={monitor} />
  </>;
}

export function WebsiteTraffic({monitor,domain}) {
  const requested = new URLSearchParams(location.hash.split("?")[1]).get("section");
  const section = sections.some(([id])=>id===requested) ? requested : "overview";
  return <div className="grid gap-4">
    <nav className="view-switch" aria-label="网站流量视图">
      {sections.map(([id,label])=><a key={id} href={id==="overview"?"#traffic":"#traffic?section="+id}
        aria-current={id===section?"page":undefined}>{label}</a>)}
    </nav>
    {section==="inspect" ? <CrawlerInspection domain={domain} /> : !monitor ?
      <Panel className="grid gap-3 p-5"><p>添加监测网站后可查看流量并配置 SDK。</p>
        <a className="underline" href="#website">打开官网分析</a></Panel> :
      section==="sdk" ? <SiteSdk monitor={monitor} /> : <TrafficOverview key={monitor.domain} monitor={monitor} />}
  </div>;
}
