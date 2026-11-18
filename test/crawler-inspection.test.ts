import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { inspectTargets, targets } from "../src/crawler-inspection/probe.ts";
import { crawlerInspection } from "../src/crawler-inspection/route.ts";

test("inspects the requested origin, follows redirects and uses the declared sitemap URL", async () => {
  const seen: string[] = [];
  const run = await inspectTargets(targets("https://shop.example.org/products?q=1"), async address => {
    seen.push(String(address));
    if (seen.length === 1) return new Response(null, {status:301, headers:{location:"https://www.example.org/robots.txt"}});
    if (seen.length === 2) return new Response("User-agent: *\nsItEmAp: /maps/main.xml\nSitemap: /maps/main.xml");
    return new Response('<?xml version="1.0"?><sitemapindex xmlns="urn:demo"></sitemapindex>');
  });
  assert.deepEqual(seen, ["https://shop.example.org/robots.txt", "https://www.example.org/robots.txt", "https://www.example.org/maps/main.xml"]);
  assert.equal(run.resources[1].finding, "Sitemap 索引");
  assert.equal(run.source, "robots.txt 声明");
  assert.throws(() => targets("http://127.0.0.1/"));
  assert.throws(() => targets("site.example.org", "file:///tmp/foo"));
});

test("missing robots, HTML fallback and manual sitemap failures keep separate outcomes", async () => {
  const run = await inspectTargets(targets("example.org"), async address => String(address).endsWith("/robots.txt")
    ? new Response(null,{status:404}) : new Response("<html/>", {headers:{"Content-Type":"text/html"}}));
  assert.equal(run.resources[0].status,404);
  assert.equal(run.resources[1].url,"https://example.org/sitemap.xml");
  assert.equal(run.resources[1].finding,"返回了 HTML 页面");
  const custom = await inspectTargets(targets("example.org", "/maps?id=1"), async address => {
    if (String(address).includes("maps")) throw Error();
    return new Response("Sitemap: https://example.org/other.xml");
  });
  assert.equal(custom.resources[1].status,null);
  assert.equal(custom.resources[1].url,"https://example.org/maps?id=1");
});

test("custom sites can import and query just the requested paths without a monitor", async () => {
  const db = await fixture();
  try {
    const post = async (path: string, body: unknown) => crawlerInspection(new Request("https://local/api/crawler-"+path,{
      method:"POST",body: JSON.stringify(body),
    }),db.binding, async () => new Response("User-agent: *"));
    const target = {url:"www.example.org/page",sitemap:"/map-index"};
    const empty = await (await post("inspect",target)).json();
    assert.ok(empty.traffic.every(row => !row.observed && row.requests===0));
    const urls = empty.resources.map(r => r.url);
    const log = ["/map-index","/other.xml","/robots.txt"].map((path,i) => JSON.stringify({
      RayID: String(i).padStart(16,"0"),EdgeStartTimestamp:new Date(Date.now()-1000).toISOString(),
      ClientRequestHost:"www.example.org",ClientRequestPath:path,EdgeResponseStatus:200,
      ClientRequestUserAgent:i===2 ? "GPTBot/1.3" : "Browser",
    })).join("\n");
    const saved = await post("resource-logs",{urls,log});
    assert.equal(saved.status,200);
    const result = await (await post("inspect",target)).json();
    assert.equal(result.traffic.length,2);
    assert.deepEqual(result.traffic.map(r => [r.path,r.requests,r.ai,r.examples.length]),
      [["/map-index",1,0,1],["/robots.txt",1,1,1]]);
  } finally { await db.close(); }
});
