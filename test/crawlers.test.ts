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

test("file totals include all sources and distinguish repeat visits from duplicate imports", async () => {
  const db = await fixture();
  try {
    const end = Date.now();
    for (const id of ["first", "second"]) {
      await db.pool.query("INSERT INTO monitors(id,config,due) VALUES(?,?,0)", [id, { domain: "example.org" }]);
    }
    const report = async (detail: string) => (await crawlerReport(db.pool, "second",
      new URLSearchParams({detail, end: String(end)}))).json();
    const line = (path: string, agent: string, time = end, host = "example.org") => JSON.stringify({
      RayID: "123456789abcdef0", EdgeStartTimestamp: new Date(time).toISOString(),
      ClientRequestHost: host, ClientRequestURI: path, ClientRequestUserAgent: agent, EdgeResponseStatus: 404,
    });
    const save = async (lines: string[]) =>
      (await importCrawlerLogs(db.pool, "example.org", lines.join("\n"))).json();
    assert.equal((await report("files")).observed, false);
    await save([line("/index.html?file=sitemap.xml", "Browser")]);
    assert.equal((await report("files")).observed, true);
    assert.deepEqual((await report("files")).files, []);
    const rows = [line("/maps/site.XML.gz?token=private", "Browser"), line("/sitemap.xml", "GPTBot/1"),
      line("/robots.txt", "OtherBot"), line("/robots.txt", "OtherBot", end - 1), line("/llms.TXT", ""),
      line("/a", "ClaudeBot/1"), line("/a.txt", "", end, "other.org"),
      line("/old.txt", "", end - 31 * 86400000)];
    assert.deepEqual(await save(rows), {added:7, duplicates:0, skipped:1});
    assert.deepEqual(await save(rows), {added:0, duplicates:7, skipped:1});
    const files = await report("files");
    assert.deepEqual(files.files, [{kind:"txt", requests:3, ai:0}, {kind:"xml", requests:2, ai:1}]);
    assert.equal(files.records.length, 5);
    assert.equal((await report("xml")).records.length, 2);
    assert.equal((await report("txt")).records.length, 3);
    assert.equal((await report("bots")).records.length, 2);
  } finally {
    await db.close();
  }
});
