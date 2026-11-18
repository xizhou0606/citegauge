import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { DataTable, FormDialog, Panel, SmallButton } from "./controls.jsx";
import { api } from "../core/api.js";

import { importCrawlerFile } from "../core/crawler-import.js";

function LogImport({ monitor, imported }) {
  const [progress, setProgress] = useState("");
  return <FormDialog onOpen={() => setProgress("")} title="导入访问日志" label="导入" save={async form => {
    const file = form.elements.log.files[0];
    if (!file) throw Error("请选择 JSONL 文件");
    const result = await importCrawlerFile(monitor.id, file, setProgress);
    imported(`新增 ${result.added} 条，重复 ${result.duplicates} 条，其他域名或未匹配爬虫的请求 ${result.skipped} 条。`);
  }}>
    <Label htmlFor="crawler-log">Cloudflare HTTP 请求日志（JSONL）</Label>
    <Input type="file" name="log" id="crawler-log" accept=".jsonl,.ndjson,.json,.txt" required />
    <p>每行一条请求。导出 RayID、EdgeStartTimestamp（RFC 3339）、ClientRequestHost、ClientRequestPath、ClientRequestUserAgent 和 EdgeResponseStatus。</p>
    {progress && <p role="status">{progress}</p>}
    <p>仅统计 {monitor.domain} 及其 www 域名。重复导入同一请求只计一次。</p>
  </FormDialog>;
}

export function CrawlerVisits({ monitor }) {
  const [query, setQuery] = useState({ page: 1 });
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    setData(null);
    setError("");
    api("crawlers/" + monitor.id + "?" + new URLSearchParams(query))
      .then(value => { if (active) setData(value); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [monitor.id, query]);
  const total = data?.groups.reduce((sum, row) => sum + row.visits, 0);
  return <Panel className="grid gap-4 p-5">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="break-all">{monitor.domain} · 近 30 天</h2>
      <LogImport monitor={monitor} imported={text => { setMessage(text); setQuery({ page: 1 }); }} />
    </header>
    <p>按请求的 User-Agent 识别爬虫，来源身份未经验证。次数包含抓取失败的请求。</p>
    {message && <p role="status">{message}</p>}
    {error && <p role="alert">{error} <SmallButton onClick={() => setQuery({ ...query })}>重试</SmallButton></p>}
    {!data && !error && <p role="status">正在读取访问日志…</p>}
    {data && (total === 0 ? <p>最近 30 天的已导入日志中暂无匹配记录。可导入官网日志查看抓取情况。</p> : <>
      <h3>爬虫访问 · {total} 次请求</h3>
      <DataTable headings={["爬虫", "请求次数", "成功（2xx）", "最近访问"]}>
        {data.groups.map(row => <TableRow key={row.bot}>
          <TableCell>{row.bot}</TableCell><TableCell>{row.visits}</TableCell>
          <TableCell>{row.ok}</TableCell><TableCell>{new Date(row.latest).toLocaleString()}</TableCell>
        </TableRow>)}
      </DataTable>
      <h3>请求明细</h3>
      <DataTable headings={["请求路径", "爬虫", "HTTP 状态", "访问时间"]}>
        {data.records.map(row => <TableRow key={row.request_id}>
          <TableCell className="whitespace-normal break-all"><details>
            <summary>{row.path}</summary><p>{row.host}</p><p>Ray ID · {row.request_id}</p><p>{row.agent}</p>
          </details></TableCell>
          <TableCell>{row.bot}</TableCell><TableCell>{row.status}</TableCell>
          <TableCell>{new Date(row.at).toLocaleString()}</TableCell>
        </TableRow>)}
      </DataTable>
      {total > 20 && <nav aria-label="爬虫日志分页" className="flex flex-wrap items-center gap-2">
        <SmallButton disabled={query.page === 1} onClick={() => setQuery({ page: query.page - 1, end: data.end })}>上一页</SmallButton>
        <span>{query.page} / {Math.ceil(total / 20)}</span>
        <SmallButton disabled={query.page * 20 >= total} onClick={() => setQuery({ page: query.page + 1, end: data.end })}>下一页</SmallButton>
      </nav>}
    </>)}
  </Panel>;
}
