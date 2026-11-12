import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./pg-fixture.ts";
import { syncAlarm } from "../src/storage/schedule.ts";

test("按 PG 中最早任务设闹钟，停用最后一项时清除", async () => {
  const db = await fixture();
  let alarm: number | null = null;
  const alarms = {
    async setAlarm(time: number) { alarm = time; },
    async deleteAlarm() { alarm = null; },
  };
  try {
    const due = Date.now() + 60_000;
    await db.pool.query("INSERT INTO monitors(id,config,due) VALUES ('a','{}',$1),('b','{}',$2)",[due,due+10000]);
    await syncAlarm(db.pool, alarms);
    assert.equal(alarm,due);
    await db.pool.query("UPDATE monitors SET due=0 WHERE id='a'");
    await syncAlarm(db.pool, alarms);
    assert.equal(alarm,due+10000);
    await db.pool.query("DELETE FROM monitors");
    await syncAlarm(db.pool, alarms);
    assert.equal(alarm,null);
  } finally {
    await db.close();
  }
});
