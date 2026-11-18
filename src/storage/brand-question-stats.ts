import { json } from "../runtime/response.ts";

export async function brandQuestionStats(db: D1Database, params: URLSearchParams) {
  const domain = params.get("domain");
  if (!domain || domain.length > 253) return json({error:"缺少品牌域名"},400);
  const latest = await db.prepare(`SELECT report->>'at' AS at FROM latest_site_review WHERE id=1
    AND report->>'$.monitor.domain'=?1 AND json_type(report,'$.identity')='object'`).bind(domain).first<{at:number}>();
  const at = params.has("at") ? Number(params.get("at")) : latest?.at ?? null;
  if (at !== null && !Number.isSafeInteger(at)) return json({error:"报告时间无效"},400);
  const end = Date.now(), start = Math.floor(end/86400000)*86400000-29*86400000;
  const {results: rows} = await db.prepare(`WITH probes AS (
    SELECT id,config,due FROM monitors WHERE config->>'domain'=?1 AND config->>'$.brandPrompt.at'=COALESCE(?2,
      (SELECT MAX(config->>'$.brandPrompt.at') FROM monitors WHERE config->>'domain'=?1)))
    SELECT m.id,m.config->>'question' AS question,m.config->>'$.brandPrompt.intent' AS intent,
      count(*) FILTER(WHERE r.state='ok') AS valid,
      count(*) FILTER(WHERE r.state='ok' AND r.detail->>'cited' IS NOT NULL) AS observable,
      count(*) FILTER(WHERE r.state='ok' AND r.detail->>'cited'=1) AS citations,
      (SELECT id FROM runs WHERE monitor=m.id AND at BETWEEN ?3 AND ?4 ORDER BY at DESC,id DESC LIMIT 1) AS sample,
      COALESCE((SELECT state FROM runs WHERE monitor=m.id AND at BETWEEN ?3 AND ?4 ORDER BY at DESC,id DESC LIMIT 1),
        CASE WHEN m.due>0 THEN 'queued' ELSE 'empty' END) AS state
    FROM probes m LEFT JOIN runs r ON r.monitor=m.id AND r.at BETWEEN ?3 AND ?4 GROUP BY m.id ORDER BY m.id`)
    .bind(domain,at,start,end).all<{id:string;question:string;intent:string;valid:number;observable:number;citations:number;sample:string|null;state:string}>();
  const totals = rows.reduce((t,r) => ({valid:t.valid+r.valid,observable:t.observable+r.observable,citations:t.citations+r.citations}),
    {valid:0,observable:0,citations:0});
  return json({rows,totals,start,end,canStartAt: latest?.at === at ? at : null});
}
