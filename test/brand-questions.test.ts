import test from "node:test";
import assert from "node:assert/strict";
import { collect } from "../src/collectors/api.ts";
import { markedSources } from "../src/collectors/ai/qwen-citations.ts";
import { runQuestionJob } from "../src/site-review/question-queue.ts";
import { siteReview } from "../src/site-review/route.ts";
import { groundedProbe } from "../src/site-review/grounded-probes.ts";
import { brandQuestionStats } from "../src/storage/brand-question-stats.ts";
import { Workspace } from "../src/storage/workspace.ts";
import { brandQuestionIntents, customerQuestionVersion } from "../src/domain/brand-question-intents.ts";
import { fixture } from "./d1-fixture.ts";

const source = [{index:1,url:"https://example.com"}, {index:2,url:"https://other.com/path"}];
const monitor = {id:"demo",brand:"例子",domain:"example.com",model:"qwen-flash",aliases:[],rivals:[],
  question:"有哪些适合零售团队的系统？",channel:"通义千问 API",daily:false};
test("联网采集保存原始响应，只把答案实际角标映射到来源，不把搜索候选计入",async t => {
  const raw = {request_id:"req",output:{choices:[{finish_reason:"stop",message:{role:"assistant",content:"答复[ref_2]"}}],
    search_info:{search_results:source}},usage:{input_tokens:10,output_tokens:10}};
  t.mock.method(globalThis,"fetch",async (_url,init) => {
    const body=JSON.parse(init.body);assert.equal(body.model,"qwen-flash");assert.equal(body.parameters.search_options.enable_citation,true);
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
      const profile={url:"https://example.com",at:1,identity:{category:"客服工具"},impression:"零售连锁",monitor,
        modules:[{name:"工单",evidence:"跨门店分派工单"}]};
      const drafts=questions.map(question=>({anchor:0,question}));
      assert.throws(()=>groundedProbe(profile,{...drafts[0],anchor:42}));
      assert.throws(()=>groundedProbe(profile,{...drafts[0],question:"例子这个产品好用吗？"}));
      let calls=0;
      t.mock.method(globalThis,"fetch",async(_url,init)=>{
        calls++;
        assert.equal(JSON.parse(init.body).model,"qwen3.7-flash");
        const message=JSON.parse(init.body).messages.at(-1).content;
        const tasks=JSON.parse(typeof message === "string" ? message : message[0].text).tasks;
        return Response.json({id:"req",model:"qwen3.7-flash",choices:[{index:0,finish_reason:"stop",
          message:{role:"assistant",content:JSON.stringify({questions:tasks.map(task=>questions[task.index])})}}]});
      });
      const ctx={blockConcurrencyWhile: fn=>fn(),storage:{setAlarm:async()=>{},deleteAlarm:async()=>{}}};
      const env={DB:f.binding,DASHSCOPE_API_KEY:"test"};
      const workspace=new Workspace(ctx,env);
      env.WORKSPACE={idFromName:()=>1,get:()=>({fetch:(url,init)=>workspace.fetch(new Request(url,init))})};
      await f.pool.query("INSERT INTO website_reports VALUES('example.com',1,?1)",[profile]);
      const legacy={...monitor,id:"legacy",question:"请分析例子官网",brandPrompt:{at:1,intent:"历史",version:4}};
      await f.pool.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,0)",[legacy.id,legacy]);
      await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES('legacy-hit',?1,?2,'ok',?3)",[legacy.id,Date.now(),{cited:true}]);
      for (let i=0;i<previous;i++) {
        const id="demo-probe-1-v"+customerQuestionVersion+"-"+i;
        const {question,...basis}=groundedProbe(profile,drafts[i]);
        const config={...monitor,id,question,brandPrompt:{at:1,intent:brandQuestionIntents[i],version:customerQuestionVersion,...basis}};
        await f.pool.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,0)",[id,config]);
        await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES(?1,?2,?3,'ok',?4)",
          ["r"+i,id,Date.now(),{cited:[true,false,null][i]}]);
      }
      const request=()=>siteReview(new Request("https://example.com/api/site-review",{method:"POST",
        body:JSON.stringify({domain:monitor.domain,questionsAt:1})}),env);
      assert.ok((await Promise.all([request(),request()])).every(r=>r.ok));
      await runQuestionJob(env);
      await request();
      await runQuestionJob(env);
      assert.equal(calls,Math.ceil((12-previous)/3));
      const probes=(await f.pool.query("SELECT due FROM monitors ORDER BY sequence")).rows;
      assert.equal(probes.length,13);
      assert.equal(probes.filter(r=>r.due>0).length,12-previous);
      const stats=await (await brandQuestionStats(f.binding,new URLSearchParams({domain:monitor.domain}))).json();
      assert.deepEqual(stats.totals,previous ? {valid:3,observable:2,citations:1} : {valid:0,observable:0,citations:0});
      assert.equal(stats.targetCount,12);
      assert.deepEqual(stats.rows.map(r=>r.question),drafts.map((d,i)=>groundedProbe(profile,d).question));
    } finally {await f.close();}
  });
}

test("同一报告时间的两个官网分别读取、排队，错误域名无法启动另一站任务",async () => {
  const f=await fixture();
  try {
    const ctx={blockConcurrencyWhile: fn=>fn(),storage:{setAlarm:async()=>{},deleteAlarm:async()=>{}}};
    const env={DB:f.binding};
    const workspace=new Workspace(ctx,env);
    env.WORKSPACE={idFromName:()=>1,get:()=>({fetch:(url,init)=>workspace.fetch(new Request(url,init))})};
    const endpoint="https://workspace/api/site-review";
    for (const domain of ["first.example","second.example"]) {
      const report={url:"https://"+domain,at:7,monitor:{...monitor,domain},identity:{category:"客服工具"}};
      await f.pool.query("INSERT INTO website_reports VALUES(?1,1,?2)",[domain,report]);
    }
    for (const domain of ["first.example","second.example","absent.example"]) {
      const read=await (await siteReview(new Request(endpoint+"?domain="+domain),env)).json();
      assert.equal(read.report?.url,domain==="absent.example"?undefined:"https://"+domain);
      await siteReview(new Request(endpoint,{method:"POST",body:JSON.stringify({domain,questionsAt:7})}),env);
    }
    assert.deepEqual((await f.pool.query("SELECT domain FROM website_question_jobs ORDER BY domain")).rows,
      [{domain:"first.example"},{domain:"second.example"}]);
  } finally {await f.close();}
});

test("采样批次并行执行三项，同样的首次任务不会产生第二份样本",async t => {
  const f=await fixture();
  try {
    let active=0,peak=0,calls=0;
    t.mock.method(globalThis,"fetch",async()=>{
      calls++; peak=Math.max(peak,++active);
      await new Promise(resolve=>setTimeout(resolve,35)); active--;
      return Response.json({request_id:"sample",output:{choices:[{finish_reason:"stop",message:{role:"assistant",content:"答案"}}],search_info:{search_results:[]}}});
    });
    for (let i=0;i<6;i++) {
      const m={...monitor,id:"test-"+i,brandPrompt:{intent:"测试",at:1,version:customerQuestionVersion}};
      await f.pool.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,1)",[m.id,m]);
    }
    const ctx={blockConcurrencyWhile:fn=>fn(),storage:{setAlarm:async()=>{},deleteAlarm:async()=>{}}};
    const workspace=new Workspace(ctx,{DB:f.binding,DASHSCOPE_API_KEY:"test"});
    await workspace.alarm(); await workspace.alarm();
    assert.equal(peak,3); assert.equal(calls,6);
    assert.equal((await f.pool.query("SELECT count(*) AS n FROM runs WHERE state='ok'")).rows[0].n,6);
  } finally {await f.close();}
});

test("官网材料可含品牌，客户实发问题拒绝品牌、域名和官网标语",() => {
  const profile={url:"https://example.com",at:1,identity:{category:"招聘筛选工具"},impression:"招聘团队",
    monitor:{...monitor,aliases:["Demo HR"],rivals:["HireVue"]},competitors:["Northwind"],
    modules:[{name:"招聘",evidence:"例子让每一份简历都有可追溯的评估记录。"}]};
  for(const question of ["Demo-HR 和别家差异是什么？","该平台适合谁使用？","去 example.com 看哪种产品？",
    "HireVue 能评估简历吗？","Northwind 是否支持招聘评估？","请参考 jobs.other.org 来比较工具？",
    "例子让每一份简历都有可追溯的评估记录。这句话对吗？"]) {
    assert.throws(()=>groundedProbe(profile,{anchor:0,question}));
  }
  const question="招聘团队每天收到很多简历，怎样快速筛出符合岗位要求的人？";
  const outgoing=groundedProbe(profile,{anchor:0,question}).question;
  assert.ok(outgoing.startsWith(question));
  assert.match(outgoing,/具体工具或平台.*适配程度从高到低.*名次、工具或平台名称、适配理由/);
  assert.doesNotMatch(outgoing,/例子|HireVue|Northwind|example\.com/);
  assert.ok(groundedProbe(profile,{anchor:0,question}).quote.includes("例子"));
});
