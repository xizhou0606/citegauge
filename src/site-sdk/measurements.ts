import { z } from "zod";
import { metricKinds } from "../../packages/citegauge/src/browser-config.ts";

const id=z.string().regex(/^[0-9a-f]{32}$/);
const event=z.object({
  id,visitor:id.optional(),
  metrics:z.array(z.object({kind:z.enum(metricKinds),label:z.string().trim().min(1).max(100)
    .regex(/^[^\u0000-\u001f\u007f]+$/),value:z.number().finite().nonnegative().max(1e12)}).strict()).max(24),
}).strict().refine(e=>e.visitor || e.metrics.length);
async function read(req: Request) {
  const reader=req.body?.getReader();
  if (!reader) return;
  const bytes=new Uint8Array(12000);
  let size=0;
  try {
    while (true) {
      const {value,done}=await reader.read();
      if (done) break;
      if (size+value.length>bytes.length) return;
      bytes.set(value,size);size+=value.length;
    }
    return JSON.parse(new TextDecoder().decode(bytes.subarray(0,size)));
  } catch { return; } finally {await reader.cancel();}
}

export async function recordMeasurements(req: Request, db: D1Database, domain: string, device: ()=>string) {
  const result=event.safeParse(await read(req));
  if (!result.success) return false;
  const {id,metrics,visitor}=result.data;
  const classification=metrics.some(m=>m.kind==="device") ? device() : null;
  const region=req.cf?.country;
  const country=typeof region==="string" && /^[A-Z]{2}$/.test(region) ? region : "未知";
  const rows=metrics.map(m=>{
    if (m.kind==="country") return {...m,label:country};
    if (m.kind==="device") return {...m,label:classification};
    return m;
  });
  const now=Date.now();
  const statements=[
    db.prepare(`INSERT OR IGNORE INTO browser_measurements(domain,event_id,kind,label,amount,at)
      SELECT domain,?,value->>'kind',value->>'label',value->>'value',?
      FROM browser_sites,json_each(?) WHERE domain=?`).bind(id,now,JSON.stringify(rows),domain),
    db.prepare("UPDATE browser_sites SET last_seen=? WHERE domain=?").bind(now,domain),
  ];
  if (visitor) statements.unshift(db.prepare(`INSERT OR IGNORE INTO browser_pageviews
    (domain,event_id,visitor,at,device,device_sampled)
    SELECT domain,?,?,?,?,? FROM browser_sites WHERE domain=?`)
    .bind(id,visitor,now,classification,classification ? 1 : 0,domain));
  await db.batch(statements);
  return true;
}
