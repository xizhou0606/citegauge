import pLimit from "p-limit";
import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";
import { original, tenantKey, verifiedBinding } from "./scope.ts";

export async function projects(db: D1Database) {
  const rows = await db.prepare(`WITH monitored AS (
    SELECT config->>'domain' AS domain, count(*) AS monitors FROM monitors GROUP BY 1
  ), domains AS (
    SELECT domain FROM monitored UNION SELECT domain FROM website_reports UNION SELECT domain FROM sdk_sites UNION SELECT domain FROM browser_sites
  ) SELECT d.domain,coalesce(m.monitors,0) AS monitors,nullif(max(coalesce(s.last_seen,0),coalesce(b.last_seen,0)),0) AS lastSeen,
    CASE WHEN s.last_seen IS NOT NULL OR b.last_seen IS NOT NULL THEN 'reporting' WHEN s.domain IS NOT NULL OR b.domain IS NOT NULL THEN 'issued' ELSE 'unconfigured' END AS state
    FROM domains d LEFT JOIN monitored m USING(domain) LEFT JOIN sdk_sites s USING(domain) LEFT JOIN browser_sites b USING(domain)
    ORDER BY lastSeen DESC,d.domain`).all();
  return rows.results;
}

export async function inventory(req: Request, env: Env) {
  const page = Number(new URL(req.url).searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return json({error:"页码无效"},400);
  const size = 10;
  const rows = await env.DB.prepare(`SELECT id,name FROM (
    SELECT 'owner-v1' AS id,'自营工作区' AS name,0 AS priority UNION ALL SELECT id,name,1 FROM tenants
  ) ORDER BY priority,name,id LIMIT ? OFFSET ?`).bind(size + 1,(page-1)*size).all<{id:string;name:string}>();
  const limit = pLimit(3);
  const tenants = await Promise.all(rows.results.slice(0,size).map(t => limit(async () => {
    try {
      const db = t.id === original ? env.DB : await verifiedBinding(env,t.id);
      if (db) return {...t, projects: await projects(db)};
    } catch { /* Keep the other tenants visible during a database outage. */ }
    return {...t, projects:null};
  })));
  const registered = await env.DB.prepare("SELECT id FROM tenants").all<{id:string}>();
  const used = new Set(registered.results.map(t => t.id));
  const available = Object.keys(env).filter(k=>k.startsWith("TENANT_")).map(k=>k.slice(7).toLowerCase())
    .filter(k=>tenantKey.test(k) && !used.has(k)).sort();
  return json({tenants, customerCount:used.size, available, page, more:rows.results.length>size});
}
