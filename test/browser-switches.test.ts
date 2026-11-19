import assert from "node:assert/strict";
import test from "node:test";
import { browserDefaults, close, init, track } from "../packages/citegauge/src/browser.ts";

test("关闭全部采集时不读写存储或注册监听，单开表单只发送无访客 ID 的提交次数",t=>{
  const requests=[];
  const doc=new EventTarget();
  const win=Object.assign(new EventTarget(),{navigation:new EventTarget()});
  const globals={window:win,location:new URL("https://pm.example/private?q=secret"),document:doc,
    fetch:async (_url,options)=>{requests.push(JSON.parse(options.body));return new Response(null,{status:204});}};
  for (const [key,value] of Object.entries(globals)) {
    const original=Object.getOwnPropertyDescriptor(globalThis,key);
    Object.defineProperty(globalThis,key,{configurable:true,value});
    t.after(()=>original ? Object.defineProperty(globalThis,key,original) : Reflect.deleteProperty(globalThis,key));
  }
  const listener=t.mock.method(doc,"addEventListener");
  t.after(close);
  const collect=Object.fromEntries(Object.keys(browserDefaults).map(k=>[k,false]));
  init({enabled:false});
  init({collect});
  assert.equal(listener.mock.callCount(),0);
  assert.equal(requests.length,0);
  init({collect:{...collect,forms:true}});
  doc.dispatchEvent(new Event("submit"));
  track("unconfigured");
  assert.equal(requests.length,1);
  assert.equal(requests[0].visitor,undefined);
  assert.deepEqual(requests[0].metrics,[{kind:"form",label:"表单提交",value:1}]);
  init({enabled:false});
  doc.dispatchEvent(new Event("submit"));
  assert.equal(requests.length,1);
});
