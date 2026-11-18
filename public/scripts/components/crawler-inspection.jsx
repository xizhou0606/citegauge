import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Panel } from "./controls.jsx";
import { CrawlerVisits, LogImport } from "./crawler-visits.jsx";
import { api } from "../core/api.js";

function ResourceResults({ result }) {
  const [traffic, setTraffic] = useState(result.traffic);
  const [message, setMessage] = useState("");
  const hosts = new Map();
  const urls = result.resources.map(resource => resource.url);
  for (const address of urls) {
    const domain = new URL(address).hostname.replace(/^www\./, "");
    hosts.set(domain, [...(hosts.get(domain) ?? []), address]);
  }
  const total = traffic.reduce((sum, row) => sum + row.requests, 0);
  const ai = traffic.reduce((sum, row) => sum + row.ai, 0);
  const observed = traffic.some(row => row.observed || row.requests > 0);
  async function imported(text) {
    setMessage(text);
    setTraffic(await api("crawler-resource-traffic", { urls }));
  }
  return <section className="grid min-w-0 gap-4" aria-label="官网文件查询结果">
    <div>
      <h3>robots.txt 和 Sitemap 访问情况</h3>
      <p>检查时间 {new Date(result.checked).toLocaleString()} · Sitemap 来自{result.source}</p>
    </div>
    {result.omitted > 0 && <p>另有 {result.omitted} 个声明地址未检查，可填入自定义 Sitemap 单独查询。</p>}
    <p>{observed ? `近 30 天已导入日志合计 ${total} 次请求，其中 ${ai} 次带已知 AI 爬虫标识。` :
      "近 30 天暂无日志，历史请求次数未知。"}</p>
    <p>历史次数取自已导入日志，按主机和路径匹配，同路径的查询参数合并计算。自定义路径可在下方重新导入完整日志。HTTP 状态反映本次公开访问。</p>
    {result.resources.map(resource => {
      const url = new URL(resource.url);
      const row = traffic.find(item => item.host === url.hostname && item.path === url.pathname);
      return <article key={resource.kind + resource.url} className="min-w-0 rounded-lg border p-3">
        <h4>{resource.kind}</h4>
        <a className="break-all underline" href={resource.url} target="_blank" rel="noreferrer">{resource.url}</a>
        {resource.finalUrl !== resource.url && <p className="break-all">跳转至 {resource.finalUrl}</p>}
        <p>{resource.status ? `HTTP ${resource.status} · ` : ""}{resource.finding}</p>
        <p>已导入请求 {row?.observed || row?.requests ? row.requests : "—"} 次 ·
          带 AI 爬虫标识 {row?.observed || row?.requests ? row.ai : "—"} 次</p>
        {row?.latest && <p>最近一次记录 {new Date(row.latest).toLocaleString()}</p>}
        {row?.examples?.length > 0 && <details>
          <summary>最近请求记录（{row.examples.length} 条）</summary>
          <ul>{row.examples.map((event, i) => <li className="break-all" key={i}>
            {new Date(event.at).toLocaleString()} · HTTP {event.status} · {event.agent || "无 User-Agent"} · Ray ID {event.id}
          </li>)}</ul>
        </details>}
      </article>;
    })}
    {[...hosts].map(([domain, addresses]) => <div key={domain} className="flex flex-wrap items-center gap-2">
      <span>{domain}</span><LogImport domain={domain} urls={addresses} imported={imported} />
    </div>)}
    {message && <p role="status">{message}</p>}
  </section>;
}

export function CrawlerInspection({ domain, monitor }) {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api("crawler-inspect", { url: fields.get("url"), sitemap: fields.get("sitemap") }));
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  }
  return <div className="grid gap-4">
    <Panel className="grid min-w-0 gap-4 p-5">
      <form onSubmit={submit} className="grid gap-3">
        <Label htmlFor="inspect-site">目标官网 URL</Label>
        <Input id="inspect-site" name="url" defaultValue={domain ?? ""} placeholder="https://www.example.com"
          maxLength={2048} required disabled={busy} />
        <Label htmlFor="inspect-map">自定义 Sitemap 地址（可选）</Label>
        <Input id="inspect-map" name="sitemap" placeholder="/maps/sitemap-index.xml" maxLength={2048} disabled={busy} />
        <div><Button type="submit" disabled={busy}>{busy ? "查询中…" : "查询访问情况"}</Button></div>
      </form>
      {error && <p role="alert">{error}</p>}
      {result && <ResourceResults key={result.checked} result={result} />}
    </Panel>
    {monitor && <details><summary>{monitor.domain} · 全部 XML / TXT 与 AI 爬虫日志</summary>
      <CrawlerVisits monitor={monitor} />
    </details>}
  </div>;
}
