import { json } from "../runtime/response.ts";

const hour = 3600000;
const day = 24 * hour;
const offset = 8 * hour;

function sourceQueries(db: D1Database, domain: string, table: "sdk_pageviews" | "browser_pageviews",
  start: number, end: number, step: number) {
  const sites = table === "sdk_pageviews" ? "sdk_sites" : "browser_sites";
  return [
    db.prepare(`SELECT last_seen FROM ${sites} WHERE domain=?`).bind(domain),
    db.prepare(`WITH visitors AS (
      SELECT count(*) AS views FROM ${table} WHERE domain=? AND at BETWEEN ? AND ? GROUP BY visitor
    ) SELECT coalesce(sum(views),0) AS pv, count(*) AS uv,
      count(*) FILTER (WHERE views=1) AS once, count(*) FILTER (WHERE views BETWEEN 2 AND 4) AS few,
      count(*) FILTER (WHERE views>=5) AS frequent FROM visitors`).bind(domain,start,end),
    db.prepare(`SELECT CAST((at-?)/? AS INTEGER) AS bucket,count(*) AS pv,count(DISTINCT visitor) AS uv
      FROM ${table} WHERE domain=? AND at BETWEEN ? AND ? GROUP BY bucket ORDER BY bucket`)
      .bind(start,step,domain,start,end),
  ];
}

export function trafficWindow(days: number, end: number) {
  if (![1,7,30].includes(days)) return;
  const start = Math.floor((end+offset)/day)*day-offset-(days-1)*day;
  return {start,end,step:days===1 ? hour : day};
}

export async function trafficReport(db: D1Database, domain: string, days: number, end = Date.now()) {
  const window = trafficWindow(days,end);
  if (!window) return json({error:"请选择今天、近 7 天或近 30 天"},400);
  const {start,step} = window;
  const results = await db.batch<Record<string,number>>([
    ...sourceQueries(db,domain,"sdk_pageviews",start,end,step),
    ...sourceQueries(db,domain,"browser_pageviews",start,end,step),
    db.prepare(`SELECT CASE WHEN device_sampled=0 THEN 'disabled' ELSE coalesce(device,'legacy') END AS category,count(*) AS pv FROM browser_pageviews
      WHERE domain=? AND at BETWEEN ? AND ? GROUP BY category ORDER BY pv DESC`).bind(domain,start,end),
  ]);
  function source(index: number) {
    const site = results[index].results[0];
    const totals = results[index+1].results[0];
    const buckets = new Map(results[index+2].results.map(row=>[row.bucket,row]));
    const trend = Array.from({length:Math.floor((end-start)/step)+1}, (_,i)=>{
      const row = buckets.get(i);
      return {at:start+i*step,pv:row?.pv ?? 0,uv:row?.uv ?? 0};
    });
    return {enabled:!!site,lastSeen:site?.last_seen ?? null,...totals,trend};
  }
  const server = source(0);
  return json({domain,start,end,days,...server,configured:server.enabled,browser:{...source(3),devices:results[6].results.map(row=>({device:row.category,pv:row.pv}))}});
}
