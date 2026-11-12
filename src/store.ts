import {
  collect,
  imported,
  measure,
  monitorFrom,
  ready,
  type Env,
  type Monitor,
  type Evidence,
} from "./model.ts";

export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
type Row = { id: string; config: string; due: number };
export class Workspace {
  private sql: SqlStorage;
  constructor(
    private ctx: DurableObjectState,
    private env: Env,
  ) {
    this.sql = ctx.storage.sql;
    this.sql.exec(
      "CREATE TABLE IF NOT EXISTS monitors(id TEXT PRIMARY KEY,config TEXT NOT NULL,due INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS schedule ON monitors(due); CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY, monitor TEXT NOT NULL, at INTEGER NOT NULL, state TEXT NOT NULL, detail TEXT NOT NULL, raw TEXT NOT NULL); CREATE INDEX IF NOT EXISTS history ON runs(monitor,at DESC)",
    );
  }
  private save(id: string, m: Monitor, e: Evidence) {
    const { raw, ...evidence } = e;
    const detail = JSON.stringify({
      ...evidence,
      ...measure(m, e),
      parser: "v1",
    });
    this.sql.exec(
      "UPDATE runs SET state='ok',detail=?,raw=? WHERE id=?",
      detail,
      raw,
      id,
    );
  }
  private async sample(m: Monitor, id: string) {
    this.sql.exec(
      "INSERT OR IGNORE INTO runs VALUES(?,?,?,'pending','{}','')",
      id,
      m.id,
      Date.now(),
    );
    if (this.sql.exec("SELECT changes() AS n").one().n !== 1) return;
    try {
      this.save(id, m, await collect(this.env, m));
    } catch (error) {
      this.sql.exec(
        "UPDATE runs SET state='failed',detail=? WHERE id=?",
        JSON.stringify({
          error: error instanceof Error ? error.message : "采集失败",
        }),
        id,
      );
    }
  }
  private async schedule() {
    const next = this.sql
      .exec("SELECT MIN(due) AS t FROM monitors WHERE due>0")
      .one().t;
    if (typeof next === "number")
      await this.ctx.storage.setAlarm(Math.max(Date.now() + 100, next));
    else await this.ctx.storage.deleteAlarm();
  }
  async alarm() {
    const row = this.sql
      .exec<Row>(
        "SELECT * FROM monitors WHERE due>0 AND due<=? ORDER BY due LIMIT 1",
        Date.now(),
      )
      .toArray()[0];
    if (row) {
      await this.sample(
        JSON.parse(row.config),
        "daily-" + row.id + "-" + row.due,
      );
      this.sql.exec(
        "UPDATE monitors SET due=? WHERE id=? AND due=?",
        Date.now() + 86400000,
        row.id,
        row.due,
      );
    }
    await this.schedule();
  }
  async fetch(req: Request) {
    const path = new URL(req.url).pathname;
    this.sql.exec(
      "UPDATE runs SET state='failed',detail=? WHERE state='pending' AND at<?",
      JSON.stringify({ error: "采样中断，请重新采样" }),
      Date.now() - 120000,
    );
    if (req.method === "GET" && path === "/api/state") {
      return json({
        monitors: this.sql
          .exec<Row>("SELECT * FROM monitors ORDER BY rowid DESC")
          .toArray()
          .map((r) => JSON.parse(r.config)),
        runs: this.sql
          .exec(
            "SELECT id,monitor,at,state,json_extract(detail,'$.matched') AS hits,json_extract(detail,'$.cited') AS cited FROM runs ORDER BY at DESC LIMIT 200",
          )
          .toArray(),
        ready: {
          "DeepSeek API": ready(this.env, "DeepSeek API"),
          "火山方舟 API": ready(this.env, "火山方舟 API"),
        },
      });
    }
    if (req.method === "GET" && path.startsWith("/api/trend/")) {
      const days = this.sql
        .exec(
          `SELECT date(at/1000,'unixepoch') AS day,
        SUM(state='ok') AS valid, SUM(state='failed') AS failed,
        SUM(CASE WHEN state='ok' AND json_array_length(detail,'$.matched')>0 THEN 1 ELSE 0 END) AS mentions,
        COUNT(CASE WHEN state='ok' THEN json_extract(detail,'$.cited') END) AS observable,
        SUM(CASE WHEN state='ok' AND json_extract(detail,'$.cited')=1 THEN 1 ELSE 0 END) AS citations
        FROM runs WHERE monitor=? AND at>=? GROUP BY day ORDER BY day DESC`,
          path.slice(11),
          Date.now() - 30 * 86400000,
        )
        .toArray();
      return json(days);
    }
    if (req.method === "GET" && path.startsWith("/api/evidence/")) {
      const r = this.sql
        .exec("SELECT * FROM runs WHERE id=?", path.slice(14))
        .toArray()[0];
      return r
        ? json({ ...r, detail: JSON.parse(String(r.detail)) })
        : json({ error: "样本不存在" }, 404);
    }
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
        m = monitorFrom(b);
      } catch (e) {
        return json({ error: (e as Error).message }, 400);
      }
      if (m.daily && !ready(this.env, m.channel))
        return json({ error: "请先配置自动采样渠道" }, 409);
      this.sql.exec(
        "INSERT INTO monitors VALUES(?,?,?)",
        m.id,
        JSON.stringify(m),
        m.daily ? Date.now() + 60000 : 0,
      );
      await this.schedule();
      return json({ id: m.id }, 201);
    }
    const r = this.sql
      .exec<Row>("SELECT * FROM monitors WHERE id=?", String(b.monitor))
      .toArray()[0];
    if (!r) return json({ error: "监测项不存在" }, 404);
    const m: Monitor = JSON.parse(r.config);
    if (path === "/api/schedule" && m.channel.endsWith("API")) {
      m.daily = b.daily === true;
      if (m.daily && !ready(this.env, m.channel))
        return json({ error: "请配置渠道密钥" }, 409);
      this.sql.exec(
        "UPDATE monitors SET config=?,due=? WHERE id=?",
        JSON.stringify(m),
        m.daily ? Date.now() + 60000 : 0,
        m.id,
      );
      await this.schedule();
      return json({ daily: m.daily });
    }
    if (path !== "/api/sample") return json({ error: "路径无效" }, 404);
    const key = String(b.key);
    if (!/^[0-9a-f-]{36}$/.test(key))
      return json({ error: "缺少采样编号" }, 400);
    const id = m.id + "-" + key;
    if (m.channel.endsWith("API")) {
      if (!ready(this.env, m.channel))
        return json({ error: "该 API 渠道尚未配置密钥或模型" }, 409);
      await this.sample(m, id);
    } else {
      let e;
      try {
        e = imported(b, m.channel);
      } catch (err) {
        return json({ error: (err as Error).message }, 400);
      }
      this.ctx.storage.transactionSync(() => {
        this.sql.exec(
          "INSERT OR IGNORE INTO runs VALUES(?,?,?,'pending','{}','')",
          id,
          m.id,
          Date.now(),
        );
        if (this.sql.exec("SELECT changes() AS n").one().n === 1)
          this.save(id, m, e);
      });
    }
    return json({ id });
  }
}
