import type { Pool } from "pg";
import { platforms } from "../domain/platforms.ts";
import { daily, history, report } from "./report.ts";
import { modelCatalog } from "../collectors/ai/factory.ts";
import { ready } from "../collectors/api.ts";
import { json } from "../runtime/response.ts";
import type { Env } from "../runtime/env.ts";

export async function readWorkspace(
  req: Request,
  path: string,
  db: Pool,
  env: Env,
) {
  const url = new URL(req.url),
    id = path.split("/").at(-1);
  if (path === "/api/state") {
    const monitors = (
      await db.query("SELECT config FROM monitors ORDER BY sequence DESC")
    ).rows.map((r) => r.config);
    const runs = url.searchParams.has("catalog")
      ? []
      : (
          await db.query(`SELECT id,monitor,at,state,detail->>'matched' AS hits,
      (detail->>'cited')::boolean::int AS cited FROM runs ORDER BY at DESC LIMIT 200`)
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
  if (path.startsWith("/api/report/") || path.startsWith("/api/history/")) {
    const { rows } = await db.query("SELECT config FROM monitors WHERE id=$1", [
      id,
    ]);
    if (!rows.length) return json({ error: "监测项不存在" }, 404);
    if (path.startsWith("/api/report/"))
      return json(await report(db, rows[0].config, Date.now()));
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
      "SELECT mime,bytes FROM screenshots WHERE run=$1",
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
    const { rows } = await db.query(
      'SELECT runs.*,EXISTS(SELECT 1 FROM screenshots WHERE run=runs.id)::int AS "hasScreenshot" FROM runs WHERE id=$1',
      [id],
    );
    return rows.length ? json(rows[0]) : json({ error: "样本不存在" }, 404);
  }
  return json({ error: "路径无效" }, 404);
}
