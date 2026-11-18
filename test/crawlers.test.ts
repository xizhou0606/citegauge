import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { crawlerReport, importCrawlerLogs } from "../src/storage/crawlers.ts";

test("crawler imports are atomic, idempotent, domain scoped and independent of samples", async () => {
  const db = await fixture();
  try {
    const end = Date.now();
    const base = { RayID: "0000000000000001", EdgeStartTimestamp: new Date(end).toISOString(),
      ClientRequestHost: "www.example.org", ClientRequestURI: "/a?q=private", EdgeResponseStatus: 403,
      ClientRequestUserAgent: "Mozilla/5.0 (compatible; GPTBot/1.3; +https://openai.com/gptbot)" };
    const log = (patch = {}) => JSON.stringify({ ...base, ...patch });
    await db.pool.query("INSERT INTO monitors(id,config,due) VALUES(?,?,0)", ["demo", { domain: "example.org" }]);
    const save = (input: string) => importCrawlerLogs(db.pool, "example.org", input);
    assert.equal((await save(log() + "\n{}")).status, 400);
    const rows = [log(), log(), log({ClientRequestHost:"elsewhere.org"}), log({ClientRequestUserAgent:"FakeGPTBot/1"}),
      log({RayID:"0000000000000002",EdgeStartTimestamp:"2000-01-01T00:00:00Z"})];
    assert.deepEqual(await (await save(rows.join("\n"))).json(), {added:2,duplicates:1,skipped:2});
    assert.deepEqual(await (await save(log())).json(), {added:0,duplicates:1,skipped:0});
    const result = await (await crawlerReport(db.pool, "demo", new URLSearchParams({end:String(end)}))).json();
    assert.deepEqual(result.groups, [{bot:"GPTBot",visits:1,ok:0,latest:end}]);
    assert.equal(result.records[0].path, "/a");
    assert.equal(result.records[0].agent, base.ClientRequestUserAgent);
  } finally {
    await db.close();
  }
});
