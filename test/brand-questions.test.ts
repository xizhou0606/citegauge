import test from "node:test";
import assert from "node:assert/strict";
import { collect } from "../src/collectors/api.ts";
import { markedSources } from "../src/collectors/ai/qwen-citations.ts";
import { startQuestions, validateQuestions } from "../src/site-review/brand-questions.ts";
import { brandQuestionStats } from "../src/storage/brand-question-stats.ts";
import { Workspace } from "../src/storage/workspace.ts";
import { brandQuestionIntents } from "../src/domain/brand-question-intents.ts";
import { fixture } from "./d1-fixture.ts";

const source = [{index:1,url:"https://example.com"}, {index:2,url:"https://other.com/path"}];
const monitor = {id:"demo",brand:"例子",domain:"example.com",model:"qwen-plus",aliases:[],rivals:[],
  question:"有哪些适合零售团队的系统？",channel:"通义千问 API",daily:false};
test("联网采集保存原始响应，只把答案实际角标映射到来源，不把搜索候选计入",async t => {
  const raw = {request_id:"req",output:{choices:[{finish_reason:"stop",message:{role:"assistant",content:"答复[ref_2]"}}],
    search_info:{search_results:source}},usage:{input_tokens:10,output_tokens:10}};
  t.mock.method(globalThis,"fetch",async (_url,init) => {
    const body=JSON.parse(init.body);assert.equal(body.parameters.search_options.enable_citation,true);
    assert.deepEqual(body.input.messages,[{role:"user",content:monitor.question}]);
    return Response.json(raw);
  });
  const result=await collect({DASHSCOPE_API_KEY:"test"},{...monitor,brandPrompt:{at:1,intent:"场景选型"}});
  assert.deepEqual(result.urls,["https://other.com/path"]);assert.deepEqual(JSON.parse(result.raw),raw);
  assert.equal(markedSources("答复[ref_7]",source),null);
  assert.equal(markedSources("答复",undefined),null);
  assert.deepEqual(markedSources("答复",source),[]);
});

for (const previous of [0,3]) {
  test(`已有 ${previous} 道题时自动补到 12 道，并发和刷新不重复建题`,async t => {
    const f=await fixture();
    try {
      const questions=brandQuestionIntents.map(intent => "零售团队在"+intent+"时应当考虑哪些客服方案？");
      assert.throws(()=>validateQuestions({questions:[questions[0],questions[0]]},monitor,2));
      assert.throws(()=>validateQuestions({questions:[questions[0]]},monitor,1,[questions[0]]));
      assert.throws(()=>validateQuestions({questions:["例子能否处理团队的排班问题？"]},monitor,1));
      let calls=0;
      t.mock.method(globalThis,"fetch",async()=>{
        calls++;
        return Response.json({id:"req",model:"qwen3.7-flash",choices:[{index:0,finish_reason:"stop",
          message:{role:"assistant",content:JSON.stringify({questions:questions.slice(previous)})}}]});
      });
      const ctx={blockConcurrencyWhile: fn=>fn(),storage:{setAlarm:async()=>{},deleteAlarm:async()=>{}}};
      const env={DB:f.binding,DASHSCOPE_API_KEY:"test"};
      const workspace=new Workspace(ctx,env);
      env.WORKSPACE={idFromName:()=>1,get:()=>({fetch:(url,init)=>workspace.fetch(new Request(url,init))})};
      await f.pool.query("INSERT INTO latest_site_review VALUES(1,1,?1)",[{at:1,identity:{category:"客服工具"},impression:"零售连锁",monitor,modules:[]}]);
      for (let i=0;i<previous;i++) {
        const id="demo-probe-1-"+i;
        const config={...monitor,id,question:questions[i],brandPrompt:{at:1,intent:brandQuestionIntents[i]}};
        await f.pool.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,0)",[id,config]);
        await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES(?1,?2,?3,'ok',?4)",
          ["r"+i,id,Date.now(),{cited:[true,false,null][i]}]);
      }
      const results=await Promise.all([startQuestions(env,1),startQuestions(env,1)]);
      assert.ok(results.every(r=>r.ok));assert.ok((await startQuestions(env,1)).ok);
      assert.equal(calls,1);
      const probes=(await f.pool.query("SELECT due FROM monitors ORDER BY sequence")).rows;
      assert.equal(probes.length,12);
      assert.equal(probes.filter(r=>r.due>0).length,12-previous);
      const stats=await (await brandQuestionStats(f.binding,new URLSearchParams({domain:monitor.domain}))).json();
      assert.deepEqual(stats.totals,previous ? {valid:3,observable:2,citations:1} : {valid:0,observable:0,citations:0});
      assert.equal(stats.targetCount,12);
      assert.deepEqual(stats.rows.map(r=>r.question),questions);
    } finally {await f.close();}
  });
}
