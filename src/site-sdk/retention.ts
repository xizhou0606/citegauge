// Use completed Beijing calendar days so today's partial day never depresses retention.
export function retentionQuery(db:D1Database, domain:string, start:number, end:number) {
  return db.prepare(`WITH first_seen AS (
    SELECT visitor, CAST((min(at)+28800000)/86400000 AS INTEGER) AS cohort
    FROM browser_pageviews WHERE domain=?1 GROUP BY visitor HAVING min(at) BETWEEN ?2 AND ?3
  ), offsets(days) AS (VALUES(1),(7)), eligible AS (
    SELECT visitor,cohort,days,(cohort+days)*86400000-28800000 AS target
    FROM first_seen CROSS JOIN offsets WHERE cohort+days < CAST((?3+28800000)/86400000 AS INTEGER)
  )
  SELECT days,count(*) AS eligible,sum(EXISTS (
    SELECT 1 FROM browser_pageviews AS p WHERE p.domain=?1 AND p.visitor=e.visitor
      AND p.at>=e.target AND p.at<e.target+86400000
  )) AS retained FROM eligible AS e GROUP BY days ORDER BY days`).bind(domain,start,end);
}
