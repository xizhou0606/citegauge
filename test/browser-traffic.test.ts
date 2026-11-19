import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { browserVisit } from "../src/site-sdk/browser.ts";
import { manageSdk } from "../src/site-sdk/manage.ts";

test("浏览器 PV 按站点与租户隔离，重复投递去重，且不会增加服务端请求", async t => {
  const [central,tenant] = await Promise.all([fixture(),fixture()]);
  t.after(()=>Promise.all([central.close(),tenant.close()]));
  await tenant.pool.query("INSERT INTO tenant_database(singleton,tenant) VALUES(1,'alpha')");
  for (const f of [central,tenant]) await f.pool.query("INSERT INTO monitors(id,config) VALUES(?,?)",["site",{domain:"pm.example.com"}]);
  const manage = (f,method="GET") => manageSdk(new Request("https://cg.example/api/site-sdk?monitor=site&browser=1",{method}),f.binding);
  await manage(tenant,"POST");
  const env = {DB:central.binding,TENANT_ALPHA:tenant.binding,BROWSER_VISIT_LIMIT:{limit:async()=>({success:true})}};
  const request = (suffix="",id="1",domain="pm.example.com") => new Request("https://cg.example/collect/browser/v1"+suffix,{
    method:"POST", headers:{origin:"https://"+domain,"content-type":"text/plain","user-agent":"Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36"},
    body:id.repeat(32)+"."+"a".repeat(32)
  });
  for (const req of [request(),request("?workspace=alpha"),request("?workspace=alpha"),
    request("?workspace=alpha","2"),request("?workspace=alpha","3","other.example.com")]) {
    assert.equal((await browserVisit(req,env)).status,204);
  }
  assert.equal((await browserVisit(request("?workspace=alpha","f".repeat(999)),env)).status,400);
  const stats = await (await manage(tenant)).json();
  assert.equal(stats.browser.pv,2);
  assert.equal(stats.browser.uv,1);
  assert.ok(stats.browser.lastSeen);
  assert.equal(stats.pv,0);
  assert.equal(stats.lastSeen,null);
  assert.equal((await (await manage(central)).json()).browser.pv,0);
});
