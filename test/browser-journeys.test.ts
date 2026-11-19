import assert from "node:assert/strict";
import test from "node:test";
import { journeys } from "../packages/citegauge/src/browser-journeys.ts";
import { browserDefaults } from "../packages/citegauge/src/browser-config.ts";

test("路径与有序漏斗跨页面生效、动态 ID 脱敏，超时后入口和步骤重新计算",t=>{
  const storage=new Map(), rows=[];
  const url=new URL("https://demo.example/start");
  for (const [key,value] of Object.entries({location:url,sessionStorage:{
    getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),
  }})) {
    const original=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>original ? Object.defineProperty(globalThis,key,original) : Reflect.deleteProperty(globalThis,key));
  }
  let now=Date.now();
  t.mock.method(Date,"now",()=>now);
  const cfg={routes:["/start","/p/:id"],goals:[{name:"详情",route:"/p/:id"}],
    funnels:[{name:"浏览",steps:["/start","/p/:id"]}]};
  const visit=()=>journeys(cfg,browserDefaults,(kind,label)=>rows.push([kind,label]))();
  visit();
  url.pathname="/p/private-id";visit();visit();
  assert.deepEqual(rows.filter(r=>r[0]==="funnel").map(r=>r[1]),["浏览 · 01 · /start","浏览 · 02 · /p/:id"]);
  assert.ok(rows.some(r=>r[1]==="/start → /p/:id"));
  assert.equal(rows.filter(r=>r[0]==="goal").length,2);
  now+=30*60000;visit();
  assert.deepEqual(rows.at(-1),["entry","/p/:id"]);
  assert.ok(!JSON.stringify([...storage.values(),rows]).includes("private-id"));
});
