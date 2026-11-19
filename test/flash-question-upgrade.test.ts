import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fixture } from "./d1-fixture.ts";
import { brandQuestionStats } from "../src/storage/brand-question-stats.ts";

test("Flash 复用已验证的问题及计划，只为新回答计算引用率",async () => {
  const f=await fixture();
  try {
    const domain="example.com",at=12,now=Date.now();
    const prior={id:"site-a-probe-12-v5-0",domain,model:"qwen-plus",question:"招聘平台如何排序？",
      channel:"通义千问 API",daily:false,brandPrompt:{at,version:5,intent:"品类发现"}};
    await f.pool.query("INSERT INTO website_reports(domain,started,report) VALUES(?1,1,?2)",
      [domain,{at,monitor:{domain},identity:{}}]);
    for (const [slot,due] of [[0,0],[1,now+60000]]) {
      const id=prior.id.slice(0,-1)+slot;
      await f.pool.query("INSERT INTO monitors(id,config,due) VALUES(?1,?2,?3)",[id,{...prior,id,daily:slot===1},due]);
    }
    await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES('prior-hit',?1,?2,'ok',?3)",
      [prior.id,now,{model:"qwen-plus",cited:true}]);
    const migration=await readFile(new URL("../migrations/d1/0010_flash_ranked_questions.sql",import.meta.url),"utf8");
    for (let i=0;i<2;i++) await f.binding.prepare(migration).run();
    const cloned=(await f.pool.query("SELECT id,config,due FROM monitors WHERE config->>'model'='qwen-flash' ORDER BY id")).rows;
    assert.equal(cloned.length,2);
    assert.equal(cloned[0].config.question,prior.question);
    assert.equal(cloned[0].due,0);
    assert.equal(cloned[1].due,now+60000);
    await f.pool.query("INSERT INTO runs(id,monitor,at,state,detail) VALUES('flash-hit',?1,?2,'ok',?3)",
      [cloned[1].id,now,{model:"qwen-flash",cited:false}]);
    const current=await readFile(new URL("../migrations/d1/0011_current_search.sql",import.meta.url),"utf8");
    for (let i=0;i<2;i++) await f.binding.prepare(current).run();
    const stats=await (await brandQuestionStats(f.binding,new URLSearchParams({domain}))).json();
    assert.equal(stats.model,"qwen3.7-flash");
    assert.equal(stats.rows.length,2);
    assert.equal(stats.rows[1].previousSample,"flash-hit");
    assert.equal(stats.rows[0].previousSample,"prior-hit");
    assert.deepEqual(stats.totals,{valid:0,observable:0,citations:0});
  } finally {await f.close();}
});
