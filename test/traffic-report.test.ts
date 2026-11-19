import assert from "node:assert/strict";
import test from "node:test";
import { trafficReport } from "../src/site-sdk/traffic.ts";
import { fixture } from "./d1-fixture.ts";

test("北京时间分桶、跨日 UV 去重以及频次边界使用同一网站和时间范围",async t=>{
  const f = await fixture();
  t.after(()=>f.close());
  const midnight = Date.parse("2026-11-18T16:00:00Z");
  const end = midnight + 3600000;
  const events = [
    ["a",midnight-1],["a",midnight],["b",midnight+12345],["b",end],
    ...Array.from({length:5},()=>["c",end]),["d",midnight-8*86400000],["e",end+1],
  ] as const;
  for (const [i,[visitor,at]] of events.entries()) {
    await f.pool.query("INSERT INTO browser_pageviews(domain,event_id,visitor,at) VALUES(?,?,?,?)",["pm.example",String(i),visitor,at]);
  }
  await f.pool.query("INSERT INTO browser_pageviews(domain,event_id,visitor,at) VALUES(?,?,?,?)",["other.example","z","z",end]);
  const read = async days=>(await (await trafficReport(f.binding,"pm.example",days,end)).json()).browser;
  const today = await read(1);
  assert.deepEqual([today.pv,today.uv,today.once,today.few,today.frequent],[8,3,1,1,1]);
  assert.deepEqual(today.trend.map(r=>[r.at,r.pv,r.uv]),[[midnight,2,2],[end,6,2]]);
  assert.deepEqual(today.devices,[{device:"legacy",pv:8}]);
  const week = await read(7);
  assert.equal(week.trend.length,7);
  assert.deepEqual([week.pv,week.uv,week.once,week.few,week.frequent],[9,3,0,2,1]);
  assert.equal((await read(30)).uv,4);
  assert.equal((await trafficReport(f.binding,"pm.example",2,end)).status,400);
});
