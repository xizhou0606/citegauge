import type { Database } from "./d1.ts";
import type { Monitor, Evidence } from "../domain/monitor.ts";
import type { Env } from "../runtime/env.ts";
import { collect } from "../collectors/api.ts";
import { measure } from "../domain/metrics.ts";
import { imported } from "../collectors/web-import.ts";
import { screenshotFrom } from "../collectors/screenshot.ts";

function parsed(m: Monitor, e: Evidence) {
  const { raw, ...evidence } = e;
  return { ...evidence, ...measure(m, e), parser: "v1" };
}
export async function collectOnce(db: Database, env: Env, m: Monitor, id: string) {
  const { rowCount } = await db.query(
    "INSERT INTO runs(id,monitor,at,state) VALUES(?1,?2,?3,'pending') ON CONFLICT DO NOTHING",
    [id, m.id, Date.now()],
  );
  if (!rowCount) return;
  try {
    const e = await collect(env, m);
    await db.query("UPDATE runs SET state='ok',detail=?1,raw=?2 WHERE id=?3", [
      parsed(m, e),
      e.raw,
      id,
    ]);
  } catch (err) {
    await db.query("UPDATE runs SET state='failed',detail=?1 WHERE id=?2", [
      { error: err instanceof Error ? err.message : "采样失败" },
      id,
    ]);
  }
}
export async function saveImported(
  db: Database,
  m: Monitor,
  id: string,
  b: Record<string, unknown>,
) {
  let e, screenshot;
  try {
    e = imported(b, m.channel);
    screenshot = screenshotFrom(b.screenshot);
  } catch (err) {
    return (err as Error).message;
  }
  const insert = db.statement(
    "INSERT INTO runs(id,monitor,at,state,detail,raw) VALUES (?1,?2,?3,'ok',?4,?5) ON CONFLICT(id) DO NOTHING",
    [id, m.id, Date.now(), parsed(m, e), e.raw],
  );
  if (screenshot) {
    await db.binding.batch([
      insert,
      db.statement("INSERT INTO screenshots SELECT ?1,?2,?3 WHERE changes()=1", [
        id, screenshot.mime, screenshot.bytes,
      ]),
    ]);
  } else {
    await insert.run();
  }
}
