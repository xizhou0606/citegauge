import assert from "node:assert/strict";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { browserVisit } from "../src/site-sdk/browser.ts";
import { insights } from "../src/site-sdk/insights.ts";

test("分项浏览器数据可独立采集，重试去重，按网站汇总业务事件与性能 P75",async t=>{
  const f=await fixture();t.after(()=>f.close());
  const domain="pm.example.com";
  await f.pool.query("INSERT INTO browser_sites(domain) VALUES(?)",[domain]);
  const env={DB:f.binding,BROWSER_VISIT_LIMIT:{limit:async()=>({success:true})}};
  async function post(id,metrics,visitor?,origin=domain) {
    const r=new Request("https://cg.example/collect/browser/v2",{method:"POST",
      headers:{origin:"https://"+origin,"content-type":"text/plain","user-agent":"Mozilla/5.0 Chrome/130.0.0.0 Safari/537.36"},
      body:JSON.stringify({id:id.toString(16).padStart(32,"0"),metrics,visitor})});
    return (await browserVisit(r,env,2)).status;
  }
  const fact=(kind,label,value=1)=>({kind,label,value});
  for(const id of [1,2,3,4,4]) assert.equal(await post(id,[fact("LCP","页面载入",id*100),fact("custom","trial")]),204);
  assert.equal(await post(5,[fact("page","/pricing")],"a".repeat(32)),204);
  assert.equal(await post(6,[fact("custom","其他网站事件")],undefined,"other.example.com"),204);
  assert.equal(await post(7,[fact("privateField","x")]),400);
  const report=await(await insights(f.binding,domain,7)).json();
  assert.deepEqual(report.visitors,{visitors:1,returningVisitors:0});
  assert.deepEqual(report.vitals,[{kind:"LCP",samples:4,p75:300}]);
  assert.deepEqual(report.groups.map(x=>[x.kind,x.samples]),[["custom",4],["page",1]]);
  assert.deepEqual((await f.binding.prepare("SELECT device,device_sampled FROM browser_pageviews").all()).results,[{device:null,device_sampled:0}]);
});
