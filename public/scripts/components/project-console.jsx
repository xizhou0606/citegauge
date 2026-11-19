import "../core/validation.js";
import { WorkspaceSelect } from "./workspace-select.jsx";
import { Building2, Globe2, RefreshCw } from "lucide-react";
import { Disclosure } from "./controls.jsx";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "../../../src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../src/components/ui/card";
import { Input } from "../../../src/components/ui/input";
import { Label } from "../../../src/components/ui/label";
import { api } from "../core/api.js";

const labels = {unconfigured:"未签发密钥", issued:"等待首次上报", reporting:"已收到上报"};
function Accounts({slots, tenants, refresh}) {
  const [result,setResult] = useState(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [target,setTarget] = useState("");
  const known = tenants.filter(t=>t.id !== "owner-v1");
  const selected = known.find(t=>t.id === target);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const body = Object.fromEntries(new FormData(form));
      setResult(await api("admin/accounts",body));
      form.reset();
      setTarget("");
      refresh();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return <Disclosure className="rounded-xl border bg-card p-5" title="开通企业账号">
    {slots.length || known.length ? <form onSubmit={submit} className="mt-4 grid max-w-xl gap-3">
      <Label htmlFor="tenant">所属企业</Label>
      <WorkspaceSelect id="tenant" name="tenant" value={target} onChange={setTarget}
        placeholder="选择已有企业或空闲数据库" options={[
          ...known.map(t => ({value:t.id, label:t.name})),
          ...slots.map(id => ({value:id, label:"新企业 · "+id})),
        ]} />
      <Label htmlFor="company">企业名称</Label>
      <Input key={target} id="company" name="name" defaultValue={selected?.name || ""} readOnly={!!selected} maxLength={80} required />
      <Label htmlFor="account">登录账号</Label>
      <Input id="account" name="username" autoComplete="off" pattern="[a-z0-9_.]{3,30}" placeholder="3–30 位小写字母、数字、点或下划线" required />
      <Button disabled={busy || !target}>{busy ? "正在开通…" : "创建账号"}</Button>
    </form> : <p className="mt-3">请先按部署文档为新企业绑定独立 D1 数据库。</p>}
    {error && <p role="alert">{error}</p>}
    {result && <div className="mt-4 grid gap-2 rounded-md border p-3" role="status">
      <strong>{result.username} 已开通</strong><Label htmlFor="generated-password">登录密码（仅本次显示）</Label>
      <Input id="generated-password" readOnly value={result.password} onFocus={e=>e.target.select()}/>
      <Button variant="outline" onClick={()=>setResult(null)}>已保存，隐藏密码</Button>
    </div>}
  </Disclosure>;
}

function Tenant({tenant}) {
  const rows = tenant.projects;
  return <Card className="tenant-card"><CardHeader><CardTitle><h2><Building2 aria-hidden="true" />{tenant.name}</h2></CardTitle>
    {rows && <p className="text-sm text-muted-foreground">{rows.length} 个网站 · {rows.filter(p=>p.state==="reporting").length} 个已收到 SDK 上报</p>}
  </CardHeader><CardContent>
    {rows === null ? <p role="alert">企业数据库暂时无法读取，请检查绑定后刷新。</p> :
      rows.length === 0 ? <p>该企业尚未添加网站。</p> :
      <ul className="divide-y">{rows.map(p=><li key={p.domain} className="grid gap-2 py-3 sm:grid-cols-2">
        <div className="min-w-0"><strong className="project-domain"><Globe2 aria-hidden="true" />{p.domain}</strong><p className="text-sm text-muted-foreground">{p.monitors} 个 GEO 监测项</p></div>
        <div><strong className="sdk-state" data-state={p.state}>{labels[p.state]}</strong>
          {p.lastSeen != null && <p className="text-sm">最近上报 {new Date(p.lastSeen).toLocaleString("zh-CN")}</p>}</div>
      </li>)}</ul>}
  </CardContent></Card>;
}

function Console() {
  const [data,setData] = useState(null);
  const [error,setError] = useState("");
  const [page,setPage] = useState(1);
  const [version,setVersion] = useState(0);
  useEffect(()=>{
    let current = true;
    setError("");
    api("admin/projects?page="+page).then(value=>{if(current) setData(value);})
      .catch(err=>{if(current) setError(err.message);});
    return ()=>{current=false;};
  },[page,version]);
  const refresh = ()=>setVersion(v=>v+1);
  return <div className="grid gap-5">
    <header className="project-heading"><div><h1 className="text-3xl font-bold">项目接入</h1>
      <p>按企业查看监测的网站、SDK 接入状态和最近上报时间。</p></div>
      <Button variant="outline" onClick={refresh}><RefreshCw size={15} />刷新</Button></header>
    {error && <p role="alert">{error}</p>}
    {!data && !error && <p role="status">正在读取企业项目…</p>}
    {data?.tenants.map(t=><Tenant key={t.id} tenant={t}/>)}
    {data && (page>1 || data.more) && <div className="flex gap-3">
      <Button variant="outline" disabled={page===1} onClick={()=>setPage(page-1)}>上一页</Button>
      <Button variant="outline" disabled={!data.more} onClick={()=>setPage(page+1)}>下一页</Button></div>}
    {data && <Accounts slots={data.available} tenants={data.tenants} refresh={refresh}/>}
  </div>;
}

window.addEventListener("session-expired",()=>location.replace("/login"));
window.addEventListener("pageshow",e=>{if(e.persisted) location.reload();});
createRoot(document.getElementById("project-console")).render(<Console/>);
