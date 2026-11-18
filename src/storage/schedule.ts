import type { Database } from "./d1.ts";

type Alarms = Pick<DurableObjectStorage, "setAlarm" | "deleteAlarm">;

export async function syncAlarm(db: Database, alarms: Alarms) {
  const result = await db.query("SELECT MIN(due) AS due FROM (SELECT due FROM monitors WHERE due>0 UNION ALL SELECT due FROM website_question_jobs WHERE due>0)");
  const due = result.rows[0].due;
  if (due === null) await alarms.deleteAlarm();
  else await alarms.setAlarm(Math.max(Date.now() + 100, due));
}
