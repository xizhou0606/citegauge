import { isbot } from "isbot";
import type { Env } from "../runtime/env.ts";
import { tenantKey, verifiedBinding } from "../tenants/scope.ts";

// Two random 128-bit IDs, hex encoded and separated by a period. No page URL or identity fields.
async function payload(req: Request) {
  const reader = req.body?.getReader();
  if (!reader) return;
  const bytes = new Uint8Array(65);
  let size = 0;
  try {
    while (true) {
      const {value,done} = await reader.read();
      if (done) break;
      if (size + value.length > bytes.length) return;
      bytes.set(value,size);
      size += value.length;
    }
    if (size === bytes.length) return /^([a-f0-9]{32})\.([a-f0-9]{32})$/.exec(new TextDecoder().decode(bytes));
  } finally { await reader.cancel(); }
}

export async function browserVisit(req: Request, env: Env) {
  const origin = req.headers.get("origin") ?? "";
  const match = /^https:\/\/([a-z0-9.-]+)$/.exec(origin);
  const ack = (status: number) => new Response(null,{status,headers:{
    "Access-Control-Allow-Origin": match ? origin : "null", "Cache-Control":"no-store", Vary:"Origin"
  }});
  if (req.method !== "POST") return ack(405);
  if (!match || !req.headers.get("content-type")?.startsWith("text/plain")) return ack(400);
  const key = req.headers.get("cf-connecting-ip") ?? "unknown";
  if (!(await env.BROWSER_VISIT_LIMIT.limit({key})).success) return ack(429);
  if (isbot(req.headers.get("user-agent") ?? "")) return ack(204);
  const tenant = new URL(req.url).searchParams.get("workspace");
  if (tenant !== null && !tenantKey.test(tenant)) return ack(400);
  const ids = await payload(req);
  if (!ids) return ack(400);
  const db = tenant === null ? env.DB : await verifiedBinding(env,tenant);
  if (!db) return ack(204);
  const domain = match[1].replace(/^www\./,"");
  const now = Date.now();
  await db.batch([
    db.prepare(`INSERT OR IGNORE INTO browser_pageviews(domain,event_id,visitor,at)
      SELECT domain,?,?,? FROM browser_sites WHERE domain=?`).bind(ids[1],ids[2],now,domain),
    db.prepare("UPDATE browser_sites SET last_seen=? WHERE domain=?").bind(now,domain),
  ]);
  return ack(204);
}
