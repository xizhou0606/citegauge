import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "../core/api.js";
import { Panel, SmallButton } from "./controls.jsx";

export function SiteSdk({monitor}) {
  const [confirmOpen,setConfirmOpen] = useState(false);
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
    setConfirmOpen(false);
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
    {stats?.browser && <section className="grid gap-2">
      <h3>浏览器接入 · 页面访问</h3>
      {stats.browser.enabled ? <>
        <p>在网站前端入口调用一次。发布后打开网站，即可在流量概览查看浏览器 PV 和 UV。</p>
        <pre><code>{'import citegauge from "citegauge/browser";\n' +
          (stats.browser.workspace ? 'citegauge.init({ workspace: "' + stats.browser.workspace + '" });' : 'citegauge.init();')}</code></pre>
      </> : <SmallButton disabled={busy} onClick={async ()=>{
        setBusy(true);
        try { await api(path+"&browser=1",{}); setRefresh(n=>n+1); }
        catch(e) { setError(e.message); } finally { setBusy(false); }
      }}>启用本站浏览器统计</SmallButton>}
    </section>}
    {stats && <>
      <h3>Node 服务端接入 · 请求与爬虫</h3>
      <p>{stats.lastSeen ? "最近上报 "+new Date(stats.lastSeen).toLocaleString() :
        stats.configured ? "等待官网首次上报" : "创建本站密钥后，按接入文档安装 SDK。"}</p>
      <div>{stats.configured ? <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild><SmallButton disabled={busy}>重置采集密钥</SmallButton></DialogTrigger>
        <DialogContent><DialogTitle>重置采集密钥？</DialogTitle>
          <DialogDescription>{monitor.domain} 的旧密钥将立即失效。请在网站服务端配置新密钥后继续上报。</DialogDescription>
          <DialogFooter><DialogClose asChild><Button variant="outline">取消</Button></DialogClose>
            <Button variant="destructive" onClick={create}>确认重置</Button></DialogFooter>
        </DialogContent>
      </Dialog> : <SmallButton disabled={busy} onClick={create}>创建采集密钥</SmallButton>}</div>
    </>}
    {token && <div><label htmlFor="site-sdk-token">请保存到服务端环境变量 CITEGAUGE_TOKEN（仅显示一次）</label>
      <Input id="site-sdk-token" className="block w-full border p-2" value={token} readOnly onFocus={e=>e.target.select()} />
      <SmallButton onClick={()=>setToken("")}>已保存，隐藏密钥</SmallButton></div>}
    {error && <div><SmallButton onClick={()=>setRefresh(n=>n+1)}>重新读取接入状态</SmallButton></div>}
  </Panel>;
}
