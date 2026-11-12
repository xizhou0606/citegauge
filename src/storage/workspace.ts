import { syncAlarm } from "./schedule.ts";
import { readWorkspace } from "./queries.ts";
import { reviewSample } from "./review.ts";
import { collectOnce, saveImported } from "./samples.ts";
import { openPool } from "./pg.ts";
import { modelCatalog } from "../collectors/ai/factory.ts";
import { ready } from "../collectors/api.ts";
import { monitorFrom, type Monitor } from "../domain/monitor.ts";
import type { Env } from "../runtime/env.ts";
import { json } from "../runtime/response.ts";

export class Workspace {
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {}
  async alarm() {
    const db = openPool(this.env);
    try {
      const { rows } = await db.query(
        "SELECT * FROM monitors WHERE due>0 AND due<=$1 ORDER BY due LIMIT 1",
        [Date.now()],
      );
      if (rows.length) {
        const r = rows[0];
        await collectOnce(
          db,
          this.env,
          r.config,
          "daily-" + r.id + "-" + r.due,
        );
        await db.query("UPDATE monitors SET due=$1 WHERE id=$2 AND due=$3", [
          Date.now() + 86400000,
          r.id,
          r.due,
        ]);
      }
      await syncAlarm(db, this.ctx.storage);
    } finally {
      await db.end();
    }
  }
  async fetch(req: Request) {
    const db = openPool(this.env);
    try {
      const path = new URL(req.url).pathname;
      await db.query(
        "UPDATE runs SET state='failed', detail=$1 WHERE state='pending' AND at<$2",
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
        await db.query("INSERT INTO monitors(id,config,due) VALUES($1,$2,$3)", [
          m.id,
          m,
          m.daily ? Date.now() + 60000 : 0,
        ]);
        if (m.daily) await syncAlarm(db, this.ctx.storage);
        return json({ id: m.id }, 201);
      }
      const { rows } = await db.query(
        "SELECT config FROM monitors WHERE id=$1",
        [String(b.monitor)],
      );
      if (!rows.length) return json({ error: "监测项不存在" }, 404);
      const m: Monitor = rows[0].config;
      if (path === "/api/schedule" && m.channel.endsWith("API")) {
        const daily = b.daily === true;
        if (daily && !ready(this.env, m.channel, m.model))
          return json({ error: "请配置渠道密钥" }, 409);
        await db.query("UPDATE monitors SET config=$1,due=$2 WHERE id=$3", [
          { ...m, daily },
          daily ? Date.now() + 60000 : 0,
          m.id,
        ]);
        await syncAlarm(db, this.ctx.storage);
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
    } finally {
      await db.end();
    }
  }
}
