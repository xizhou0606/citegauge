import { qwenSearchModel } from "../collectors/ai/qwen.ts";
import type { Monitor } from "../domain/monitor.ts";
import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";

import { customerDrafts } from "./customer-drafts.ts";
import { groundedProbe, type Profile } from "./grounded-probes.ts";
import { brandQuestionIntents, customerQuestionVersion } from "../domain/brand-question-intents.ts";

export async function prepareQuestions(env: Env, at: number, domain: string) {
  const entry = await env.DB.prepare("SELECT json_remove(report,'$.screenshot','$.industry') AS profile , (SELECT json_group_array(value->>'name') FROM json_each(report,'$.industry.rows')) AS competitors FROM website_reports WHERE domain=?2 AND report->>'at'=?1")
    .bind(at,domain).first<{profile: string; competitors:string}>();
  if (!entry) return json({error:"官网报告已更新，请刷新。"},409);
  const profile: Profile = JSON.parse(entry.profile);
  profile.competitors = JSON.parse(entry.competitors);
  if (!profile.monitor || !profile.identity || !env.DASHSCOPE_API_KEY) return json({error:"需要有品牌定位的报告和千问配置。"},409);
  const m = profile.monitor;
  const prefix = m.id + "-probe-" + at + "-v" + customerQuestionVersion + "-";
  const stored = await env.DB.prepare(`SELECT id,config->>'question' AS question FROM monitors
    WHERE config->>'domain'=?1 AND config->>'$.brandPrompt.at'=?2 AND config->>'$.brandPrompt.version'=?3`).bind(m.domain,at,customerQuestionVersion).all<{id:string;question:string}>();
  const existingIds = new Set(stored.results.map(row => row.id));
  const missing = brandQuestionIntents.map((intent,i) => ({intent,index:i,id:prefix+i})).filter(slot => !existingIds.has(slot.id));
  if (missing.length) {
    const drafts = await customerDrafts(env.DASHSCOPE_API_KEY,profile,missing);
    const seen = new Set(stored.results.map(r => r.question));
    const probes = missing.flatMap((slot,i) => {
      try {
        const probe = groundedProbe(profile,drafts[i]);
        if (seen.has(probe.question)) return [];
        seen.add(probe.question);
        return [{...probe,...slot}];
      } catch { return []; }
    });
    if (!probes.length) return json({error:"官网没有足够的可核对依据。"},502);
    const schedules = await env.DB.prepare(`SELECT config->>'$.brandPrompt.intent' AS intent FROM monitors
      WHERE config->>'domain'=?1 AND config->>'$.brandPrompt.at'=?2 AND config->>'daily'=1
      AND coalesce(config->>'$.brandPrompt.version',0)<?3`).bind(domain,at,customerQuestionVersion).all<{intent:string}>();
    const dailyIntents = new Set(schedules.results.map(row => row.intent));
    const now = Date.now();
    const inserted = await env.DB.batch(probes.map(({question,mode,section,quote,id,intent}) => {
      const probe: Monitor = {...m, id, model:qwenSearchModel, daily:dailyIntents.has(intent), question, brandPrompt:{at,intent,mode,section,quote,version:customerQuestionVersion}};
      return env.DB.prepare(`INSERT INTO monitors(id,config,due) SELECT ?1,?2,?3 WHERE EXISTS
        (SELECT 1 FROM website_reports WHERE domain=?5 AND report->>'at'=?4) ON CONFLICT(id) DO NOTHING`)
        .bind(probe.id,JSON.stringify(probe),now,at,domain);
    }));
    if (inserted.every(row => !row.meta.changes)) {
      const latest = await env.DB.prepare("SELECT 1 FROM website_reports WHERE domain=?2 AND report->>'at'=?1").bind(at,domain).first();
      if (!latest) return json({error:"官网报告已更新，请刷新。"},409);
    }
    if (probes.length < missing.length) return json({error:"部分问题需重新核对官网依据。"},502);
  }
  return json({queued:true});
}
