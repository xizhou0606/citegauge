import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { privateApi, workspaceAccess } from "../src/auth/server.ts";
import { addAccount } from "../src/tenants/accounts.ts";
import { inventory } from "../src/tenants/projects.ts";
import { schedulerEnv, verifiedBinding } from "../src/tenants/scope.ts";
import { collect } from "../src/site-sdk/ingest.ts";
import { readWorkspace } from "../src/storage/queries.ts";
import { Database } from "../src/storage/d1.ts";

test("同域名、同监测项 ID 的两个企业分别登录、出报表和上报，运营清单按企业归集", async t => {
  const [central,a,b] = await Promise.all([fixture(),fixture(),fixture()]);
  t.after(()=>Promise.all([central.close(),a.close(),b.close()]));
  const origin = "http://localhost:8787";
  const idFromName = name => ({name,equals:other=>name === other.name});
  const env = {DB:central.binding,TENANT_ALPHA:a.binding,TENANT_BETA:b.binding,
    BETTER_AUTH_URL:origin,BETTER_AUTH_SECRET:"test-".repeat(12),SLACK_CHANNEL_ID:"C123",
    WORKSPACE:{idFromName,get:id=>({fetch:async req=>{
      const scoped = await schedulerEnv(env,id);
      return readWorkspace(req,new URL(req.url).pathname,new Database(scoped.DB),scoped);
    }})}};
  const request = (path,cookie="",body?) => new Request(origin+path,{method:body?"POST":"GET",
    headers:{origin,cookie,"content-type":"application/json"},body:body && JSON.stringify(body)});
  async function login(id) {
    const user = {tenant:id,name:"企业 "+id,username:"user_"+id};
    const created = await addAccount(request("/api/admin/accounts","",user),env);
    assert.equal(created.status,201);
    const creds = await created.json();
    const signed = await privateApi(request("/api/auth/sign-in/username","",creds),env);
    assert.equal(signed.status,200);
    return signed.headers.getSetCookie().find(x=>x.includes("session_token=")).split(";")[0];
  }
  const alpha = await login("alpha");
  const beta = await login("beta");
  for (const [store,brand] of [[a,"alpha"],[b,"beta"]]) {
    await store.pool.query("INSERT INTO monitors(id,config) VALUES(?,?)",["same",{domain:"example.com",brand}]);
    await store.pool.query("INSERT INTO website_reports(domain,started,report) VALUES(?,1,?)",["example.com",{brand}]);
  }
  const call = (path,cookie,body?)=>privateApi(request(path,cookie,body),env);
  for (const [id,cookie] of [["alpha",alpha],["beta",beta]]) {
    const access = await workspaceAccess(request("/workspace",cookie),env);
    assert.deepEqual(access,{operator:false,tenant:"企业 "+id});
    assert.equal((await call("/api/admin/projects",cookie)).status,403);
    assert.equal((await call("/api/admin/accounts",cookie,{})).status,403);
    const catalog = await (await call("/api/state?tenant=other",cookie)).json();
    assert.deepEqual(catalog.monitors.map(m=>m.brand),[id]);
    const {report} = await (await call("/api/site-review?domain=example.com",cookie)).json();
    assert.equal(report.brand,id);
    const destinations = await (await call("/api/destinations",cookie)).json();
    assert.equal(destinations[0].address,"");
  }
  const sdk = "/api/site-sdk?monitor=same";
  const {token} = await (await call(sdk,alpha,{})).json();
  await call(sdk,beta,{});
  const event = {id:"f".repeat(16),at:Date.now(),visitor:"a".repeat(64),host:"example.com",agent:"Browser",path:"/",status:200};
  const post = key=>collect(new Request(origin+"/collect/v1",{method:"POST",
    headers:{authorization:"Bearer "+key,"content-type":"application/json"},body:JSON.stringify({events:[event]})}),env);
  assert.equal((await post(token)).status,204);
  assert.equal((await post(token.replace(".alpha",".beta"))).status,401);
  assert.equal((await (await call(sdk,alpha)).json()).pv,1);
  assert.equal((await (await call(sdk,beta)).json()).pv,0);
  const result = await (await inventory(request("/api/admin/projects"),env)).json();
  assert.deepEqual(result.tenants.map(t=>[t.id,t.projects[0]?.state]),[
    ["owner-v1",undefined],["alpha","reporting"],["beta","issued"]]);
  await central.pool.query("DELETE FROM tenant_members WHERE tenant='alpha'");
  assert.equal((await call("/api/state",alpha)).status,403);
  assert.equal(await verifiedBinding({...env,TENANT_BETA:a.binding},"beta"),undefined);
  assert.equal((await call("/api/state",beta)).status,200);
});
