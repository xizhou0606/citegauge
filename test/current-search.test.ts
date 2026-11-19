import test from "node:test";
import assert from "node:assert/strict";
import { expandSearchEvidence } from "../src/collectors/ai/search-archive.ts";
import { collect } from "../src/collectors/api.ts";

const monitor = {channel:"通义千问 API",brandPrompt:{at:1,intent:"首次采购"},question:"有哪些排班工具？",model:"qwen3.7-flash"};
const env = {DASHSCOPE_API_KEY:"fixture"};
const search = {output:{search_info:{search_results:[{index:1,url:"https://example.org/"},{index:2,url:"https://example.com/"}]}}};
const answer = {output:{choices:[{message:{content:[{text:"甲[ref_2]"}]},finish_reason:"stop"}]}};
function response(frames) {
  const bytes = new TextEncoder().encode(frames.map(f=>"event: result\ndata: "+JSON.stringify(f)+"\n\n").join(""));
  return new Response(new ReadableStream({start(controller) {
    for (let i=0;i<bytes.length;i+=7) controller.enqueue(bytes.slice(i,i+7));
    controller.close();
  }}));
}

test("实际联网记录时间和原始流，只统计回答引用的网页",async t => {
  t.mock.method(globalThis,"fetch",async (url,init) => {
    const body = JSON.parse(init.body);
    assert.match(url,/multimodal-generation/);
    assert.equal(new Headers(init.headers).get("X-DashScope-SSE"),"enable");
    assert.equal(body.parameters.search_options.forced_search,true);
    assert.deepEqual(body.input.messages.at(-1).content,[{text:monitor.question}]);
    return response([search,answer]);
  });
  const sample = await collect(env,monitor);
  assert.deepEqual(sample.urls,["https://example.com/"]);
  assert.ok(Number.isFinite(Date.parse(sample.searchedAt)));
  assert.match(JSON.parse(expandSearchEvidence(sample.raw)).sse,/甲\[ref_2\]/);
});

test("来源缺失、回答中断或流中报错都不能算作成功联网",async t => {
  const cases = [[answer],[search], [search,answer,{code:"SearchFailed"}]];
  t.mock.method(globalThis,"fetch",async () => response(cases.shift()));
  for (let i=0;i<3;i++) await assert.rejects(collect(env,monitor));
});

test("重复发送来源的大响应流可完整回读，D1 中只占一条样本的容量",async t => {
  const repeated={output:{search_info:{search_results:[{index:2,url:"https://example.com/",title:"资料".repeat(4000)}]}}};
  const frames=[...Array(42).fill(repeated),answer];
  const sse=frames.map(f=>"data: "+JSON.stringify(f)+"\n\n").join("");
  t.mock.method(globalThis,"fetch",async () => new Response(sse));
  const sample=await collect(env,monitor);
  assert.ok(Buffer.byteLength(sse)>650000);
  assert.ok(Buffer.byteLength(sample.raw)<650000);
  assert.equal(JSON.parse(expandSearchEvidence(sample.raw)).sse,sse);
});
