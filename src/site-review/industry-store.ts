import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";
import type { Identity } from "./identity.ts";
import { sourcePreview, type IndustryPreview } from "./industry-preview.ts";
import { compareIndustry, mergeBrands } from "./industry.ts";

type Comparison = Awaited<ReturnType<typeof compareIndustry>> & {preview?: IndustryPreview | null; revision?: number};

export function saveIndustry(db: D1Database, url: string, started: number, at: number, industry: Comparison, screenshot?: string, guard?: number) {
  const domain = new URL(url).hostname.replace(/^www\./, "");
  return db.prepare(`INSERT INTO industry_reviews(domain,started,report) SELECT ?1,?2,?3 WHERE ?4 IS NULL OR EXISTS
      (SELECT 1 FROM latest_site_review WHERE started=?2 AND report->>'$.industry.revision'=?4)
    ON CONFLICT(domain) DO UPDATE SET started=excluded.started, report=excluded.report
    WHERE excluded.started >= industry_reviews.started`).bind(domain, started,
      JSON.stringify({...industry, at, url, screenshot}), guard ?? null);
}

export async function fillIndustry(env: Env, at: number, expand = false, sources: string[] = []) {
  const row = await env.DB.prepare("SELECT started,report FROM latest_site_review WHERE id=1 AND report->>'at'=?1")
    .bind(at).first<{started: number; report: string}>();
  if (!row) return json({error: "官网报告已更新，请刷新。"}, 409);
  const report: {url: string; identity: Identity | null; modules: {name: string; evidence: string}[];
    screenshot?: string; industry?: Comparison} = JSON.parse(row.report);
  if (!expand && report.industry?.rows.length && report.industry.revision) return json({report});
  if (!env.DASHSCOPE_API_KEY) return json({error: "请先配置千问密钥。"}, 503);
  const previous = report.industry;
  const industry: Comparison = await compareIndustry(report.identity, report.modules.map(({name, evidence}) => ({name, evidence})),
    report.url, env.DASHSCOPE_API_KEY, env.BRAVE_SEARCH_API_KEY, previous?.rows.map(r => r.name), sources);
  if (!industry.rows.length) return json({error: industry.note}, 422);
  const verified = industry.rows;
  industry.rows = mergeBrands(previous?.rows || [], industry.rows);
  industry.queries = [...new Set([...(previous?.queries || []), ...industry.queries])];
  industry.preview = previous?.preview || await sourcePreview(env.BROWSER, verified);
  industry.revision = Date.now();
  const before = previous?.revision ?? 0;
  const [updated] = await env.DB.batch([
    env.DB.prepare(`UPDATE latest_site_review SET report=json_set(report,'$.industry',json(?1))
      WHERE id=1 AND started=?2 AND report->>'at'=?3 AND coalesce(report->>'$.industry.revision',0)=?4`).bind(JSON.stringify(industry), row.started, at, before),
    saveIndustry(env.DB, report.url, row.started, industry.revision, industry, report.screenshot, industry.revision),
  ]);
  if (!updated.meta.changes) return json({error: "官网报告已更新，请刷新。"}, 409);
  return json({report: {...report, industry}});
}
