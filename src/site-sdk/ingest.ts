import { json } from "../runtime/response.ts";
import { identifyCrawler } from "../../packages/citegauge/src/bots.ts";
import { tokenHash } from "./manage.ts";
import { z } from "zod";

import { verifiedBinding } from "../tenants/scope.ts";
import type { Env } from "../runtime/env.ts";

const credential = /^Bearer (cg_[a-f0-9]{64}(?:\.([a-z][a-z0-9]{0,23}))?)$/;

export async function collect(req: Request, env: Env) {
  const tenant = credential.exec(req.headers.get("authorization") || "")?.[2];
  const db = tenant ? await verifiedBinding(env, tenant) : env.DB;
  return db ? ingest(req, db) : json({error:"网站密钥无效"},401);
}

const limit = 260000;
const batch = z.object({events:z.array(z.object({
  id:z.string().regex(/^[a-f0-9]{16}$/), at:z.number().int().safe(),
  host:z.string().max(253),path:z.string().min(1).max(2048).regex(/^\/[^?#\x00-\x1f]*$/),
  status:z.number().int().min(100).max(599),agent:z.string().max(1024),
  visitor:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
})).min(1).max(16)});

async function read(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let bytes = 0, body = "";
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) return;
      body += decoder.decode(value,{stream:true});
    }
    return JSON.parse(body+decoder.decode());
  } finally { await reader.cancel(); }
}

export async function ingest(req: Request, db: D1Database) {
  if (req.method !== "POST") return json({error:"需要 POST"},405);
  const bearer = credential.exec(req.headers.get("authorization") || "");
  if (!bearer) return json({error:"需要网站采集密钥"},401);
  const hash = await tokenHash(bearer[1]);
  const site = await db.prepare("SELECT domain FROM sdk_sites WHERE token_hash=?").bind(hash).first<{domain:string}>();
  if (!site) return json({error:"网站密钥无效"},401);
  if (!req.headers.get("content-type")?.startsWith("application/json")) return json({error:"需要 JSON"},415);
  const result = batch.safeParse(await read(req).catch(() => null));
  if (!result.success) return json({error:"无效的事件批次"},400);
  const now = Date.now(), domain = site.domain;
  const events = result.data.events.map(e => ({...e,bot:identifyCrawler(e.agent)}));
  if (events.some(e => e.host !== domain && e.host !== "www."+domain)) return json({error:"密钥与网站不匹配"},403);
  if (events.some(e => e.at > now+300000 || e.at < now-30*86400000)) return json({error:"事件时间超出范围"},400);
  const rows = JSON.stringify(events);
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO sdk_pageviews(domain,event_id,at,visitor)
      SELECT ?1,value->>'id',value->>'at',value->>'visitor' FROM json_each(?2)
      WHERE value->>'visitor' IS NOT NULL AND value->>'bot'=''`).bind(domain,rows),
    db.prepare(`INSERT OR IGNORE INTO crawler_visits(domain,request_id,at,bot,host,path,status,agent)
      SELECT ?1,value->>'id',value->>'at',value->>'bot',value->>'host',value->>'path',value->>'status',value->>'agent'
      FROM json_each(?2) WHERE value->>'bot'<>'' OR lower(value->>'path') LIKE '%.txt'
      OR lower(value->>'path') LIKE '%.xml' OR lower(value->>'path') LIKE '%.xml.gz'`).bind(domain,rows),
    db.prepare(`INSERT INTO crawler_log_days(domain,day,first_seen,last_seen)
      SELECT ?1,(value->>'at')/86400000,min(value->>'at'),max(value->>'at') FROM json_each(?2) WHERE true GROUP BY 2
      ON CONFLICT(domain,day) DO UPDATE SET first_seen=min(first_seen,excluded.first_seen),
      last_seen=max(last_seen,excluded.last_seen)`).bind(domain,rows),
    db.prepare("UPDATE sdk_sites SET last_seen=? WHERE domain=?").bind(now,domain),
  ]);
  return new Response(null,{status:204});
}
