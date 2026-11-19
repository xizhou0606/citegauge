import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";
import { CrawlerInspection } from "./crawler-inspection.jsx";
import { CrawlerVisits } from "./crawler-visits.jsx";
import { SiteSdk } from "./site-sdk.jsx";

const sections = [["overview","流量概览"],["inspect","文件检查"],["sdk","SDK 接入"]];
function TrafficOverview({monitor}) {
  const [refresh,setRefresh] = useState(0);
  const [stats,setStats] = useState(null);
  const [error,setError] = useState("");
  useEffect(() => {
    let active = true;
    api("site-sdk?monitor="+encodeURIComponent(monitor.id))
      .then(data => { if (active) {setStats(data);setError("");} })
      .catch(e => { if (active) setError(e.message); });
    return () => { active=false; };
  },[monitor.id,refresh]);
  const observed = stats?.lastSeen >= Date.now()-30*86400000;
  return <>
    <Panel className="grid gap-3 p-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2>{monitor.domain} · 近 30 天</h2><SmallButton onClick={()=>setRefresh(n=>n+1)}>刷新统计</SmallButton>
      </header>
      {error && <p role="alert">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {[["pv","页面浏览量（PV）"],["uv","估算访客数（UV）"]].map(([key,label])=>
          <div key={key} className="rounded-lg border p-3"><p>{label}</p>
            <strong className="block text-2xl">{observed ? stats[key].toLocaleString() : "—"}</strong></div>)}
      </div>
      {stats && <p>{stats.lastSeen ? "SDK 最近上报 "+new Date(stats.lastSeen).toLocaleString() :
        stats.configured ? "等待 SDK 首次上报。" : <a className="underline" href="#traffic?section=sdk">接入 SDK 后查看 PV 和 UV</a>}</p>}
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
      section==="sdk" ? <SiteSdk monitor={monitor} /> : <TrafficOverview monitor={monitor} />}
  </div>;
}
