import { json } from "../runtime/response.ts";
import { trafficWindow } from "./traffic.ts";
import { retentionQuery } from "./retention.ts";

export async function insights(db: D1Database, domain: string, days: number) {
  const window=trafficWindow(days,Date.now());
  if (!window) return json({error:"时间范围无效"},400);
  const {start,end}=window;
  const [groups,vitals,visitors,retention,receipt,trend]=await db.batch<Record<string,unknown>>([
    db.prepare(`WITH counts AS (
      SELECT kind,label,count(*) AS samples,sum(amount) AS total FROM browser_measurements
      WHERE domain=? AND at BETWEEN ? AND ? AND kind NOT IN ('LCP','INP','CLS','TTFB','FCP') GROUP BY kind,label
    ), ranks AS (SELECT *, row_number() OVER (PARTITION BY kind ORDER BY CASE WHEN kind='engagement' THEN total ELSE samples END DESC,label) AS rank,
      sum(samples) OVER (PARTITION BY kind) AS denominator FROM counts)
    SELECT kind,label,samples,total,denominator FROM ranks WHERE rank<=10 OR (kind='funnel' AND rank<=120) ORDER BY kind,rank`)
      .bind(domain,start,end),
    db.prepare(`WITH samples AS (SELECT kind,amount,
      row_number() OVER(PARTITION BY kind ORDER BY amount) AS rank,count(*) OVER(PARTITION BY kind) AS n
      FROM browser_measurements WHERE domain=? AND at BETWEEN ? AND ? AND kind IN ('LCP','INP','CLS','TTFB','FCP'))
      SELECT kind,n AS samples,amount AS p75 FROM samples WHERE rank=(3*n+3)/4 ORDER BY kind`)
      .bind(domain,start,end),
    db.prepare(`WITH seen AS (SELECT DISTINCT visitor FROM browser_pageviews WHERE domain=?1 AND at BETWEEN ?2 AND ?3)
      SELECT count(*) AS visitors,count(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM browser_pageviews h WHERE h.domain=?1 AND h.visitor=seen.visitor AND h.at<?2
      )) AS returningVisitors FROM seen`).bind(domain,start,end),
    retentionQuery(db,domain,start,end),
    db.prepare(`SELECT max(at) AS lastDetail FROM browser_measurements
      WHERE domain=? AND at BETWEEN ? AND ?`).bind(domain,start,end),
    db.prepare(`SELECT kind, CAST((at-?2)/?4 AS INTEGER) AS bucket, count(*) AS samples, sum(amount) AS total
      FROM browser_measurements WHERE domain=?1 AND at BETWEEN ?2 AND ?3
        AND kind NOT IN ('LCP','INP','CLS','TTFB','FCP','funnel')
      GROUP BY kind,bucket ORDER BY kind,bucket`).bind(domain,start,end,window.step),
  ]);
  return json({domain,days,start,end,step:window.step,groups:groups.results,vitals:vitals.results,
    visitors:visitors.results[0],retention:retention.results,lastDetail:receipt.results[0]?.lastDetail ?? null,
    trend:trend.results});
}
