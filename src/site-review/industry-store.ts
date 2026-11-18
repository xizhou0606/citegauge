import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";
import type { Identity } from "./identity.ts";
import { compareIndustry } from "./industry.ts";

type Comparison = Awaited<ReturnType<typeof compareIndustry>>;

export function saveIndustry(db: D1Database, url: string, started: number, at: number, industry: Comparison) {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  return db.prepare(`INSERT INTO industry_reviews(domain,started,report) VALUES (?1,?2,?3)
    ON CONFLICT(domain) DO UPDATE SET started=excluded.started, report=excluded.report
    WHERE excluded.started >= industry_reviews.started`).bind(domain, started,
      JSON.stringify({...industry, at, url}));
}

export async function fillIndustry(env: Env, at: number) {
  const row = await env.DB.prepare("SELECT started,report FROM latest_site_review WHERE id=1 AND report->>'at'=?1")
    .bind(at).first<{started: number; report: string}>();
  if (!row) return json({error: "官网报告已更新，请刷新。"}, 409);
  const report: {url: string; identity: Identity | null; modules: {name: string; evidence: string}[];
    industry?: Comparison} = JSON.parse(row.report);
  if (report.industry?.rows.length) return json({report});
  if (!env.DASHSCOPE_API_KEY) return json({error: "请先配置千问密钥。"}, 503);
  const industry = await compareIndustry(report.identity, report.modules.map(({name, evidence}) => ({name, evidence})),
    report.url, env.DASHSCOPE_API_KEY, env.BRAVE_SEARCH_API_KEY);
  if (!industry.rows.length) return json({error: industry.note}, 422);
  const [updated] = await env.DB.batch([
    env.DB.prepare(`UPDATE latest_site_review SET report=json_set(report,'$.industry',json(?1))
      WHERE id=1 AND started=?2 AND report->>'at'=?3`).bind(JSON.stringify(industry), row.started, at),
    saveIndustry(env.DB, report.url, row.started, Date.now(), industry),
  ]);
  if (!updated.meta.changes) return json({error: "官网报告已更新，请刷新。"}, 409);
  return json({report: {...report, industry}});
}
