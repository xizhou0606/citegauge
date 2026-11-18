import { json } from "../runtime/response.ts";
import { Database } from "../storage/d1.ts";
import { importCrawlerLogs } from "../storage/crawlers.ts";
import { websiteURL } from "../site-review/capture.ts";
import { inspectTargets, targets } from "./probe.ts";

export async function resourceTraffic(db: Database, resources: string[], end: number) {
  const sites = resources.map(value => {
    const url = new URL(value);
    return { host: url.hostname, path: url.pathname, domain: url.hostname.replace(/^www\./, "") };
  });
  const { rows } = await db.query(`WITH targets AS (
    SELECT DISTINCT value->>'domain' AS domain,value->>'host' AS host,value->>'path' AS path FROM json_each(?1)
  ) SELECT t.host,t.path,count(v.request_id) AS requests,count(nullif(v.bot,'')) AS ai,
    max(v.at) AS latest,
    EXISTS(SELECT 1 FROM crawler_log_days d WHERE d.domain=t.domain AND d.last_seen>=?2
      AND d.first_seen<=?3) AS observed
    FROM targets t LEFT JOIN crawler_visits v ON t.domain=v.domain AND t.host=v.host
      AND t.path=v.path AND v.at BETWEEN ?2 AND ?3 GROUP BY t.domain,t.host,t.path`, [sites,end-30*86400000,end]);
  const events = await db.binding.batch(sites.map(site => db.statement(`SELECT request_id AS id,at,status,agent
    FROM crawler_visits WHERE domain=?1 AND host=?2 AND path=?3 AND at BETWEEN ?4 AND ?5
    ORDER BY at DESC,request_id LIMIT 5`, [site.domain, site.host, site.path, end-30*86400000, end])));
  return rows.map(row => ({
    ...row,
    examples: events[sites.findIndex(site => site.host === row.host && site.path === row.path)].results,
  }));
}

export async function crawlerInspection(req: Request, binding: D1Database, load: typeof fetch = fetch) {
  if (req.method !== "POST") return json({ error: "需要 POST 请求" }, 405);
  const db = new Database(binding);
  let body;
  try {
    body = await req.json<Record<string, unknown>>();
    if (!body || typeof body !== "object") throw Error();
  } catch { return json({ error: "请求格式无效" }, 400); }
  if (new URL(req.url).pathname === "/api/crawler-inspect") {
    let input;
    try { input = targets(body.url, body.sitemap); }
    catch { return json({ error: "请输入公开官网 URL 和有效的 Sitemap 地址" }, 400); }
    const inspected = await inspectTargets(input, load);
    const checked = Date.now();
    const traffic = await resourceTraffic(db, inspected.resources.map(r => r.url), checked);
    return json({ ...inspected, checked, traffic });
  }
  let urls: URL[];
  try {
    if (!Array.isArray(body.urls) || !body.urls.length || body.urls.length > 6) throw Error();
    urls = body.urls.map(value => new URL(websiteURL(value)));
  } catch { return json({ error: "资源地址无效" }, 400); }
  if (new URL(req.url).pathname === "/api/crawler-resource-traffic")
    return json(await resourceTraffic(db, urls.map(u => u.href), Date.now()));
  const domain = urls[0].hostname.replace(/^www\./, "");
  if (urls.some(url => url.hostname.replace(/^www\./, "") !== domain))
    return json({ error: "请按日志所属域名导入" }, 400);
  return importCrawlerLogs(db, domain, body.log, new Set(urls.map(url => url.pathname)));
}
