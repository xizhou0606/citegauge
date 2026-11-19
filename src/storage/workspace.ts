import { importCrawlerLogs } from "./crawlers.ts";
import { historicalProbe } from "../domain/brand-question-intents.ts";
import pLimit from "p-limit";
import { runQuestionJob } from "../site-review/question-queue.ts";
import { sendReport } from "../delivery/report.ts";
import { ensureSiteMonitor } from "../site-review/monitor.ts";
import type { Identity } from "../site-review/identity.ts";
import { syncAlarm } from "./schedule.ts";
import { readWorkspace } from "./queries.ts";
import { reviewSample } from "./review.ts";
import { collectOnce, saveImported } from "./samples.ts";
import { Database } from "./d1.ts";
import { modelCatalog } from "../collectors/ai/factory.ts";
import { ready } from "../collectors/api.ts";
import { monitorFrom, type Monitor } from "../domain/monitor.ts";
import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";

export class Workspace {
  private ctx: DurableObjectState;
  private env: Env;


  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
  async alarm() {
    const db = new Database(this.env.DB);
    const { rows } = await db.query(
      "SELECT * FROM monitors WHERE due>0 AND due<=?1 ORDER BY due,sequence LIMIT 6",
      [Date.now()],
    );
    const limit = pLimit(3);
    const samples = rows.map(r => limit(async () => {
      if (historicalProbe(r.config)) {
        await db.query("UPDATE monitors SET due=0 WHERE id=?1 AND due=?2",[r.id,r.due]);
        return;
      }
      await collectOnce(
        db,
        this.env,
        r.config,
        r.config.daily ? "daily-" + r.id + "-" + r.due : "initial-" + r.id,
      );
      await db.query("UPDATE monitors SET due=?1 WHERE id=?2 AND due=?3", [
        r.config.daily ? Date.now() + 86400000 : 0,
        r.id,
        r.due,
      ]);
    }));
    const outcomes = await Promise.allSettled([runQuestionJob(this.env), ...samples]);
    const failed = outcomes.find(result => result.status === "rejected");
    if (failed) throw failed.reason;
    await this.ctx.blockConcurrencyWhile(() => syncAlarm(db, this.ctx.storage));
  }
  async fetch(req: Request) {
    const db = new Database(this.env.DB);
    const path = new URL(req.url).pathname;
    if (path === "/internal/arm-questions" && req.method === "POST") {
      await this.ctx.blockConcurrencyWhile(() => syncAlarm(db, this.ctx.storage));
      return json({queued:true});
    }
    if (path === "/internal/site-monitor" && req.method === "POST") {
      const { url, identity } = await req.json<{ url: string; identity: Identity }>();
      return this.ctx.blockConcurrencyWhile(async () => {
        const monitor = await ensureSiteMonitor(this.env.DB, url, identity);
        await syncAlarm(db, this.ctx.storage);
        return json(monitor);
      });
    }
    await db.query(
      "UPDATE runs SET state='failed', detail=?1 WHERE state='pending' AND at<?2",
      [{ error: "采样中断，请重新采样" }, Date.now() - 120000],
    );
    if (req.method === "GET")
      return await readWorkspace(req, path, db, this.env);
    if (req.method !== "POST") return json({ error: "路径无效" }, 404);
    let b;
    try {
      b = await req.json<Record<string, unknown>>();
      if (!b || typeof b !== "object") throw Error();
    } catch {
      return json({ error: "请求格式无效" }, 400);
    }
    if (path === "/api/monitors") {
      let m;
      try {
        m = monitorFrom(b, modelCatalog(this.env));
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      if (m.daily && !ready(this.env, m.channel, m.model))
        return json({ error: "请先配置自动采样渠道" }, 409);
      await db.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,?3)", [
        m.id,
        m,
        m.daily ? Date.now() + 60000 : 0,
      ]);
      if (m.daily) await this.ctx.blockConcurrencyWhile(() => syncAlarm(db, this.ctx.storage));
      return json({ id: m.id }, 201);
    }
    const { rows } = await db.query(
      "SELECT config FROM monitors WHERE id=?1",
      [String(b.monitor)],
    );
    if (!rows.length) return json({ error: "监测项不存在" }, 404);
    const m: Monitor = rows[0].config;
    if (historicalProbe(m) && (path === "/api/sample" || (path === "/api/schedule" && b.daily === true)))
      return json({error:"此题已归档，请在回答与引用中选择客户搜索问题。"},409);
    if (path === "/api/crawler-logs") return importCrawlerLogs(db, m.domain, b.log);
    if (path === "/api/send-report") return sendReport(db, this.env, m, b);
    if (path === "/api/schedule" && m.channel.endsWith("API")) {
      const daily = b.daily === true;
      if (daily && !ready(this.env, m.channel, m.model))
        return json({ error: "请配置渠道密钥" }, 409);
      await db.query("UPDATE monitors SET config=?1,due=?2 WHERE id=?3", [
        { ...m, daily },
        daily ? Date.now() + 60000 : 0,
        m.id,
      ]);
      await this.ctx.blockConcurrencyWhile(() => syncAlarm(db, this.ctx.storage));
      return json({ daily });
    }
    if (path === "/api/review") return await reviewSample(db, m.id, b);
    if (path !== "/api/sample") return json({ error: "路径无效" }, 404);
    if (!/^[0-9a-f-]{36}$/.test(String(b.key)))
      return json({ error: "缺少采样编号" }, 400);
    const id = m.id + "-" + b.key;
    if (m.channel.endsWith("API")) {
      if (!ready(this.env, m.channel, m.model))
        return json({ error: "该 API 渠道尚未配置密钥或模型" }, 409);
      await collectOnce(db, this.env, m, id);
    } else {
      const error = await saveImported(db, m, id, b);
      if (error) return json({ error }, 400);
    }
    return json({ id });
  }
}
