import { armQuestions } from "./question-queue.ts";
import { sourcePreview } from "./industry-preview.ts";
import { fillIndustry, previousIndustry, reconcileChanges, saveIndustry } from "./industry-store.ts";
import { compareIndustry, mergeBrands } from "./industry.ts";
import { checkExamples } from "./claims.ts";
import { expandAdvice } from "./expand.ts";
import { json } from "../runtime/response.ts";
import type { Env } from "../runtime/env.ts";
import { capture, websiteURL } from "./capture.ts";
import type { Monitor } from "../domain/monitor.ts";
import { analyze } from "./analyze.ts";

export async function siteReview(req: Request, env: Env) {
  if (req.method === "GET") {
    const domain = new URL(req.url).searchParams.get("domain");
    const row = await env.DB.prepare("SELECT report FROM website_reports WHERE ?1 IS NULL OR domain=?1 ORDER BY started DESC LIMIT 1").bind(domain)
      .first<{ report: string }>();
    const report = row ? JSON.parse(row.report) : null;
    if (report?.modules) report.modules = checkExamples(report.modules);
    return json({ report });
  }
  if (req.method !== "POST") return json({ error: "请求方法无效" }, 405);
  let url;
  try {
    const body = await req.json<{ url?: unknown; domain?: string; questionsAt?: number; expandAt?: number; industryAt?: number; expandIndustry?: boolean; sources?: unknown }>();
    if ([body.questionsAt, body.industryAt, body.expandAt].some(Number.isSafeInteger) && !body.domain)
      return json({error:"请刷新并选择监测网站。"},409);
    if (Number.isSafeInteger(body.questionsAt)) {
      const job = await env.DB.prepare(`INSERT INTO website_question_jobs(domain,revision,due)
        SELECT domain,?2,?3 FROM website_reports WHERE domain=?1 AND report->>'at'=?2
        ON CONFLICT(domain) DO UPDATE SET due=excluded.due,attempts=0 WHERE website_question_jobs.due=0`)
        .bind(body.domain!,body.questionsAt!,Date.now()).run();
      await armQuestions(env);
      return json({queued:true, changed:job.meta.changes});
    }
    if (Number.isSafeInteger(body.industryAt)) {
      if (body.sources !== undefined && (!Array.isArray(body.sources) || body.sources.length > 12))
        return json({error: "每次最多可补充 12 个公开产品页。"}, 400);
      const sources = Array.isArray(body.sources) ? [...new Set(body.sources.map(websiteURL))] : [];
      return fillIndustry(env, body.industryAt!, body.expandIndustry === true, sources, body.domain!);
    }
    if (Number.isSafeInteger(body.expandAt)) return expandAdvice(env, body.expandAt!,body.domain!);
    url = websiteURL(body.url);
  } catch {
    return json({ error: "请输入公开官网的网址，例如 https://example.com" }, 400);
  }
  if (!env.BROWSER || !env.DASHSCOPE_API_KEY)
    return json({ error: "官网分析需要浏览器绑定和千问视觉模型密钥" }, 503);
  const started = Date.now();
  let snapshot;
  try {
    snapshot = await capture(env.BROWSER, url);
  } catch (e) {
    const message = (e as Error).message;
    return json({ error: /^[\u3400-\u9fff]/u.test(message) ? message : "官网抓取失败，请稍后重试" }, 502);
  }
  let review;
  try {
    review = await analyze(snapshot, env.DASHSCOPE_API_KEY);
  } catch (e) {
    const message = (e as Error).message;
    const kind = e instanceof Error ? e.name : "Unknown";
    const code = e && typeof e === "object" && "statusCode" in e ? Number(e.statusCode) : undefined;
    console.warn("site-review analysis failed", { kind, code });
    return json({ error: message.startsWith("页面内容") || message.startsWith("未取得")
      ? message : "已取得官网截图，但千问未返回可用报告，请重试或检查模型额度" }, 502);
  }
  let monitor: Monitor | null = null;
  if (review.identity) {
    const workspace = env.WORKSPACE.get(env.WORKSPACE.idFromName("owner-v1"));
    const created = await workspace.fetch("https://workspace/internal/site-monitor", {
      method: "POST", body: JSON.stringify({ url: snapshot.url, identity: review.identity }),
    });
    if (!created.ok) return json({ error: "品牌已识别，监测项创建失败，请重新提交网址" }, 503);
    monitor = await created.json<Monitor>();
  }
  const modules = review.modules.map(({name, evidence, source}) => {
    const section = source === "原文" && snapshot.sections?.find(s => s.heading === evidence);
    return { name, evidence: section ? section.heading + "\n" + section.body.slice(0, 900) : evidence };
  });
  const prior = review.identity && await previousIndustry(env.DB, snapshot.url, review.identity.category);
  const comparison = await compareIndustry(review.identity, modules, snapshot.url,
    env.DASHSCOPE_API_KEY, env.BRAVE_SEARCH_API_KEY, prior?.rows.map(r => r.name));
  const checked = reconcileChanges(prior?.rows || [], modules);
  const rows = mergeBrands(checked, comparison.rows);
  const industry = {...comparison, rows, revision: Date.now(),
    queries: [...new Set([...(prior?.queries || []), ...comparison.queries])],
    preview: prior?.preview || await sourcePreview(env.BROWSER, comparison.rows)};

  const report = { ...review, industry, modules: checkExamples(review.modules.map((module,i) => ({...module, passageText:modules[i].evidence}))), monitor, url: snapshot.url, title: snapshot.title,
    screenshot: snapshot.screenshot, at: Date.now() };
  const domain = new URL(snapshot.url).hostname.replace(/^www\./, "");
  const latest = env.DB.prepare(`INSERT INTO website_reports (domain,started,report) VALUES (?3,?1,?2)
    ON CONFLICT (domain) DO UPDATE SET started=excluded.started,report=excluded.report
    WHERE excluded.started >= website_reports.started`).bind(started, JSON.stringify(report),domain);
  const byDomain = saveIndustry(env.DB, snapshot.url, started, report.at, industry, snapshot.screenshot);
  const statements = [latest,byDomain];
  if (monitor) statements.push(env.DB.prepare(`INSERT INTO website_question_jobs(domain,revision,due)
    SELECT domain,?2,?3 FROM website_reports WHERE domain=?1 AND report->>'at'=?2
    ON CONFLICT(domain) DO UPDATE SET revision=excluded.revision,due=excluded.due,attempts=0`)
    .bind(domain,report.at,Date.now()));
  const [saved] = await env.DB.batch(statements);
  if (!saved.meta.changes) return json({error:"此网站已有更新的分析，请刷新报告。"},409);
  if (monitor) await armQuestions(env);
  return json({ report });
}
