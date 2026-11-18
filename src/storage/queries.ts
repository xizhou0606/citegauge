import { destinations } from "../delivery/chat.ts";
import type { Database } from "./d1.ts";
import { platforms } from "../domain/platforms.ts";
import { daily, history, report } from "./report.ts";
import { modelCatalog } from "../collectors/ai/factory.ts";
import { ready } from "../collectors/api.ts";
import { json } from "../runtime/response.ts";
import type { Env } from "../runtime/env.ts";

export async function readWorkspace(
  req: Request,
  path: string,
  db: Database,
  env: Env,
) {
  const url = new URL(req.url),
    id = path.split("/").at(-1);
  if (path === "/api/destinations") return json(destinations(env));
  if (path === "/api/state") {
    const monitors = (
      await db.query("SELECT config FROM monitors ORDER BY sequence DESC")
    ).rows.map((r) => r.config);
    const runs = url.searchParams.has("catalog")
      ? []
      : (
          await db.query(`SELECT id,monitor,at,state,detail->>'matched' AS hits,
      detail->>'cited' AS cited FROM runs ORDER BY at DESC LIMIT 200`)
        ).rows;
    const models = modelCatalog(env);
    return json({
      platforms,
      monitors,
      runs,
      models: Object.fromEntries(models),
      ready: Object.fromEntries(
        Array.from(models.keys(), (channel) => [channel, ready(env, channel)]),
      ),
    });
  }
  if (path.startsWith("/api/industry/")) {
    const row = await db.binding.prepare(`SELECT i.report, l.report->>'at' AS reviewAt FROM monitors m JOIN industry_reviews i
      ON i.domain = lower(m.config->>'domain') LEFT JOIN latest_site_review l ON l.started=i.started WHERE m.id=?1`).bind(id!).first<{report: string; reviewAt: number | null}>();
    return json({ industry: row ? {...JSON.parse(row.report), reviewAt: row.reviewAt} : null });
  }
  if (path.startsWith("/api/initial-sample/")) {
    const row = await db.binding.prepare("SELECT state FROM runs WHERE id=?1")
      .bind("initial-" + id).first<{ state: string }>();
    return json({ state: row?.state || "queued" });
  }
  if (path.startsWith("/api/report/") || path.startsWith("/api/history/")) {
    const { rows } = await db.query("SELECT config FROM monitors WHERE id=?1", [
      id,
    ]);
    if (!rows.length) return json({ error: "监测项不存在" }, 404);
    if (path.startsWith("/api/report/")) {
      const end = Number(url.searchParams.get("end") ?? Date.now());
      if (!Number.isSafeInteger(end) || end <= 0 || end > 8640000000000000) return json({error: "时间窗无效"}, 400);
      return json(await report(db, rows[0].config, end));
    }
    try {
      return json(await history(db, id!, url.searchParams));
    } catch (e) {
      if (
        e instanceof Error &&
        ["时间窗或页码无效", "筛选项无效"].includes(e.message)
      )
        return json({ error: e.message }, 400);
      throw e;
    }
  }
  if (path.startsWith("/api/trend/"))
    return json(await daily(db, id!, Date.now() - 30 * 86400000, Date.now()));
  if (path.startsWith("/api/screenshot/")) {
    const { rows } = await db.query(
      "SELECT mime,bytes FROM screenshots WHERE run=?1",
      [id],
    );
    return rows.length
      ? new Response(new Uint8Array(rows[0].bytes), {
          headers: {
            "Content-Type": rows[0].mime,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        })
      : json({ error: "未附截图" }, 404);
  }
  if (path.startsWith("/api/evidence/")) {
    const fields = url.searchParams.get("view") === "answer" ? "runs.id,runs.state,runs.detail" : "runs.*";
    const { rows } = await db.query(
      `SELECT ${fields},EXISTS(SELECT 1 FROM screenshots WHERE run=runs.id) AS "hasScreenshot" FROM runs WHERE id=?1`,
      [id],
    );
    return rows.length ? json(rows[0]) : json({ error: "样本不存在" }, 404);
  }
  return json({ error: "路径无效" }, 404);
}
