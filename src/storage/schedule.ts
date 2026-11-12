import type { Pool } from "pg";

type Alarms = Pick<DurableObjectStorage, "setAlarm" | "deleteAlarm">;

export async function syncAlarm(db: Pool, alarms: Alarms) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    // Serialize alarm updates without blocking the Durable Object's input gate
    // while PostgreSQL socket events are pending.
    await client.query("SELECT pg_advisory_xact_lock(72691303)");
    const result = await client.query("SELECT MIN(due) AS due FROM monitors WHERE due > 0");
    const due = result.rows[0].due;
    if (due === null) await alarms.deleteAlarm();
    else await alarms.setAlarm(Math.max(Date.now() + 100, due));
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
