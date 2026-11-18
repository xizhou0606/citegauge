import type { Monitor } from "../domain/monitor.ts";
import type { Database } from "../storage/d1.ts";
import type { Env } from "../runtime/env.ts";
import { report } from "../storage/report.ts";
import { json } from "../runtime/response.ts";
import { destinations, postReport } from "./chat.ts";

const date = (time: number) => new Date(time).toISOString().slice(0, 10);
const text = (s: string) => s.replace(/[\r\n]/g, " ").replace(/[\\`*_{}\[\]()<>!|@#]/g, "\\$&");
const ratio = (n: number, d: number) => d ? `${n} / ${d}（${Math.round(100 * n / d)}%）` : "尚无可判定样本";

export function channelReport(m: Monitor, data: Awaited<ReturnType<typeof report>>) {
  const c = data.summary;
  return [`**${text(m.brand)} · 品牌监测报告**`, `${text(m.channel)} · ${text(m.model || "网页采样")}`,
    `${date(data.start)} 至 ${date(data.end)} UTC`, "", `监测问题 · ${text(m.question)}`,
    "", `有效回答 ${c.valid} / ${c.total}，失败 ${c.failed}，采集中 ${c.pending}`,
    `品牌提及 · ${ratio(c.mentions, c.valid)}`, `官网引用 · ${ratio(c.citations, c.observable)}`,
    `明确推荐 · ${ratio(c.recommended, c.reviewed)}`,
    ...data.rivals.slice(0, 3).map(r => `竞品 · ${text(r.name)}（${r.hits} 份回答）`),
    ...data.sources.slice(0, 3).map(s => `引用来源 · ${text(new URL(s.name).hostname)}（${s.hits} 份回答引用该网址）`),
  ].join("\n");
}

export async function sendReport(db: Database, env: Env, m: Monitor, body: Record<string, unknown>, post = postReport) {
  const target = destinations(env).find(t => t.id === body.platform);
  const end = body.end;
  if (!target || typeof end !== "number" || !Number.isSafeInteger(end) || end <= 0 || end > Date.now() ||
      typeof body.key !== "string" || !/^[0-9a-f-]{36}$/.test(body.key))
    return json({ error: "发送请求无效，请重新打开报告" }, 400);
  if (!target.ready) return json({ error: "此发送渠道尚未配置" }, 409);
  const data = await report(db, m, end);
  if (!data.summary.total) return json({ error: "当前时间窗没有采样结果" }, 409);
  const message = channelReport(m, data);
  const keys = [m.id, target.id, body.key];
  const claim = await db.query("INSERT INTO report_deliveries VALUES(?1,?2,?3,'sending',?4) ON CONFLICT DO NOTHING",
    [...keys, Date.now()]);
  const where = " WHERE monitor=?1 AND platform=?2 AND request_id=?3";
  if (!claim.rowCount) {
    const { rows } = await db.query("SELECT state FROM report_deliveries" + where, keys);
    return rows[0]?.state === "sent" ? json({ sent: true }) : json({ error: "送达状态待确认，请先查看目标会话" }, 409);
  }
  try {
    await post(env, target.id as "slack" | "telegram", target.address, message);
  } catch {
    await db.query("UPDATE report_deliveries SET state='unknown'" + where, keys);
    return json({ error: "未取得送达回执，请核对机器人权限和目标会话" }, 502);
  }
  await db.query("UPDATE report_deliveries SET state='sent'" + where, keys);
  return json({ sent: true });
}
