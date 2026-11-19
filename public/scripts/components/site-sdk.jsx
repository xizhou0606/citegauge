import { useEffect, useState } from "react";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";

export function SiteSdk({monitor}) {
  const [stats,setStats] = useState(null);
  const [error,setError] = useState("");
  const [token,setToken] = useState("");
  const [busy,setBusy] = useState(false);
  const [refresh,setRefresh] = useState(0);
  const path = "site-sdk?monitor="+encodeURIComponent(monitor.id);
  useEffect(() => {
    let active = true;
    api(path).then(data => {if (active) {setStats(data);setError("");}})
      .catch(e => {if (active) setError(e.message);});
    return () => {active=false;};
  },[path,refresh]);
  async function create() {
    if (stats.configured && !window.confirm("重置后旧密钥立即失效。继续重置？")) return;
    setBusy(true);
    try {
      const result = await api(path+(stats.configured?"&rotate=1":""),{});
      setToken(result.token);
      setRefresh(n=>n+1);
    } catch (e) {setError(e.message);}
    finally {setBusy(false);}
  }
  return <Panel className="grid gap-3 p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2>{monitor.domain} · SDK 接入</h2><div className="flex flex-wrap gap-3">
        <a className="underline" href="/docs/sdk/">TypeScript 接入文档</a>
        <a className="underline" href="/docs/sdk/llms-full.txt">AI 文档全文</a>
      </div>
    </header>
    {error && <p role="alert">{error}</p>}
    {stats && <>
      <p>{stats.lastSeen ? "最近上报 "+new Date(stats.lastSeen).toLocaleString() :
        stats.configured ? "等待官网首次上报" : "创建本站密钥后，按接入文档安装 SDK。"}</p>
      <div><SmallButton disabled={busy} onClick={create}>{stats.configured?"重置采集密钥":"创建采集密钥"}</SmallButton></div>
    </>}
    {token && <div><label htmlFor="site-sdk-token">请保存到服务端环境变量 CITEGAUGE_TOKEN（仅显示一次）</label>
      <input id="site-sdk-token" className="block w-full border p-2" value={token} readOnly onFocus={e=>e.target.select()} />
      <SmallButton onClick={()=>setToken("")}>已保存，隐藏密钥</SmallButton></div>}
    {error && <div><SmallButton onClick={()=>setRefresh(n=>n+1)}>重新读取接入状态</SmallButton></div>}
  </Panel>;
}
