import test from "node:test";
import assert from "node:assert/strict";
import { collect } from "../src/collectors/api.ts";
import { markedSources } from "../src/collectors/ai/qwen-citations.ts";
import { startQuestions, validateQuestions } from "../src/site-review/brand-questions.ts";
import { brandQuestionStats } from "../src/storage/brand-question-stats.ts";
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

test("同一报告重复启动只建三项，跨问题合并分子分母，旧监测项不进入统计",async t => {
  const f=await fixture();
  try {
    const questions=["零售团队可以考虑哪些客户管理产品？","多门店如何选型客户反馈收集工具？","小团队如何比较客服系统的分单和协作能力？"];
    assert.throws(()=>validateQuestions({questions:[questions[0],questions[0],questions[2]]},monitor));
    assert.throws(()=>validateQuestions({questions:[questions[0],questions[1],"例子能否处理团队的排班问题？"]},monitor));
    t.mock.method(globalThis,"fetch",async()=>Response.json({id:"req",model:"qwen3.7-flash",
      choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:JSON.stringify({questions})}}]}));
    const env={DB:f.binding,DASHSCOPE_API_KEY:"test",WORKSPACE:{idFromName:()=>1,get:()=>({fetch:()=>Response.json({queued:true})})}};
    await f.pool.query("INSERT INTO latest_site_review VALUES(1,1,?1)",[{at:1,identity:{category:"客服工具"},impression:"零售连锁",monitor,modules:[]}]);
    assert.equal((await startQuestions(env,1)).status,200);
    assert.equal((await startQuestions(env,1)).status,200);
    const probes=(await f.pool.query("SELECT id,config FROM monitors ORDER BY id")).rows;
    assert.equal(probes.length,3);
    for (const [i,cited] of [true,false,null].entries()) {
      await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES(?1,?2,?3,'ok',?4)",
        ["r"+i,probes[i].id,Date.now(),{cited}]);
    }
    const stats=await (await brandQuestionStats(f.binding,new URLSearchParams({domain:monitor.domain}))).json();
    assert.deepEqual(stats.totals,{valid:3,observable:2,citations:1});
    assert.deepEqual(stats.rows.map(r=>r.question),questions);
  } finally {await f.close();}
});
