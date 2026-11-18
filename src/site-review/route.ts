import { json } from "../runtime/response.ts";
import type { Env } from "../runtime/env.ts";
import { capture, websiteURL } from "./capture.ts";
import type { Monitor } from "../domain/monitor.ts";
import { analyze } from "./analyze.ts";

export async function siteReview(req: Request, env: Env) {
  if (req.method === "GET") {
    const row = await env.DB.prepare("SELECT report FROM latest_site_review WHERE id=1")
      .first<{ report: string }>();
    return json({ report: row ? JSON.parse(row.report) : null });
  }
  if (req.method !== "POST") return json({ error: "请求方法无效" }, 405);
  let url;
  try {
    url = websiteURL((await req.json<{ url?: unknown }>()).url);
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
  const report = { ...review, monitor, url: snapshot.url, title: snapshot.title,
    screenshot: snapshot.screenshot, at: Date.now() };
  await env.DB.prepare(`INSERT INTO latest_site_review (id,started,report) VALUES (1,?1,?2)
    ON CONFLICT (id) DO UPDATE SET started=excluded.started,report=excluded.report
    WHERE excluded.started >= latest_site_review.started`).bind(started, JSON.stringify(report)).run();
  return json({ report });
}
