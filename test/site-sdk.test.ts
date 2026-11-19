import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import test from "node:test";
import citegauge from "../packages/citegauge/src/index.ts";
import { fixture } from "./d1-fixture.ts";
import { manageSdk } from "../src/site-sdk/manage.ts";
import { ingest } from "../src/site-sdk/ingest.ts";
import { crawlerReport } from "../src/storage/crawlers.ts";

test("真实 Node 请求经 SDK 进入对应网站，重试去重且旧密钥无法写入",async t => {
  const f = await fixture();
  t.after(()=>f.close());
  for (const domain of ["example.com","other.com"])
    await f.pool.query("INSERT INTO monitors(id,config) VALUES(?,?)",[domain,{domain}]);
  const url = "https://cg.example/api/site-sdk?monitor=example.com";
  const manage = (method="GET",suffix="") => manageSdk(new Request(url+suffix,{method}),f.binding);
  const {token} = await (await manage("POST")).json();
  assert.equal((await manage("POST")).status,409);
  const received = [];
  const intake = createServer(async (req,res) => {
    let body="";
    for await (const chunk of req) body+=chunk;
    received.push(body);
    const response=await ingest(new Request("https://cg.example/collect/v1",{method:"POST",headers:req.headers,body}),f.binding);
    res.writeHead(response.status).end();
  }).listen(0,"127.0.0.1");
  await once(intake,"listening");
  t.after(()=>intake.close());
  const site = createServer((req,res) => {
    res.writeHead(req.url==="/robots.txt"?404:200,{"content-type":req.url==="/"?"text/html":"text/plain"}).end("sample");
  }).listen(0,"127.0.0.1");
  await once(site,"listening");
  t.after(()=>site.close());
  const options = {domain:"example.com",token,endpoint:"http://127.0.0.1:"+intake.address().port};
  const [client,again]=await Promise.all([citegauge.init(options),citegauge.init(options)]);
  assert.equal(client,again);
  t.after(()=>client.close());
  const userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
  const {get:httpGet}=await import("node:http");
  async function hit(path,agent,host="example.com",extra={}) {
    const req=httpGet("http://127.0.0.1:"+site.address().port+path,{headers:{host,"user-agent":agent,...extra}});
    const [res]=await once(req,"response");res.resume();await once(res,"end");
  }
  await hit("/",userAgent);await hit("/",userAgent);
  await hit("/",userAgent,"example.com",{purpose:"prefetch"});
  await hit("/robots.txt","GPTBot/1.0");await hit("/map.xml?secret=omit",userAgent);
  await hit("/","ClaudeBot/1.0","other.com");
  await client.flush();
  const stats=await (await manage()).json();
  assert.equal(stats.pv,2);assert.equal(stats.uv,1);assert.ok(stats.lastSeen);
  const result=await (await crawlerReport(f.pool,"example.com",new URLSearchParams())).json();
  assert.equal(result.groups[0].bot,"GPTBot");assert.equal(result.groups[0].visits,1);
  assert.equal(result.records[0].status,404);
  assert.deepEqual(result.files.map(x=>[x.kind,x.requests]),[["txt",1],["xml",1]]);
  const post=body=>ingest(new Request("https://cg.example/collect/v1",{method:"POST",body,
    headers:{authorization:"Bearer "+token,"content-type":"application/json"}}),f.binding);
  assert.ok(received.length);assert.ok(!received.join("").includes("secret=omit"));
  for(const body of received) assert.equal((await post(body)).status,204);
  assert.equal((await (await manage()).json()).pv,2);
  assert.equal((await post(received[0].replaceAll("example.com","other.com"))).status,403);
  assert.equal((await manage("POST","&rotate=1")).status,201);
  assert.equal((await post(received[0])).status,401);
  await client.close();
});
