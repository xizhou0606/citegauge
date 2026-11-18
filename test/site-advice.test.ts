import test from "node:test";
import assert from "node:assert/strict";
import { applyAdvice, expandAdvice } from "../src/site-review/expand.ts";
import { reviewDocument } from "../public/scripts/components/review-export.js";
import { fixture } from "./d1-fixture.ts";

const actions = [
  { target: "案例入口", instruction: "把入口放到相关功能介绍末尾", example: "阅读客户的使用过程", verify: "点击进入对应案例" },
  { target: "页面标题", instruction: "写明这个案例解决的任务", example: "零售团队如何整理门店反馈", verify: "标题描述案例中的任务" },
];
test("模块逐项对应，详细建议进入报告、提示词和单模块导出", () => {
  const modules = [{name:"案例", source:"原文", evidence:"客户故事"}, {name:"首屏", actions}];
  const result = applyAdvice(modules, {modules:[{index:0,actions}]});
  assert.equal(result[1], modules[1]);
  assert.deepEqual(result[0].actions, actions);
  assert.throws(() => applyAdvice(modules, {modules:[]}));
  assert.throws(() => applyAdvice(modules, {modules:[{index:0, actions:[actions[0]]}]}));
  for (const prompt of [true, false]) {
    const text = reviewDocument({url:"https://example.com", at:1, modules:result}, prompt, [result[0]]);
    for (const a of actions) for (const v of Object.values(a)) assert.ok(text.includes(v));
    assert.ok(!text.includes("## 首屏"));
  }
});
test("旧报告细化请求不能替换另一份报告，已生成的建议可直接回读", async () => {
  const f = await fixture();
  try {
    const report = {at:123, modules:[{name:"案例", actions}]};
    await f.binding.prepare("INSERT INTO latest_site_review VALUES(1,100,?1)").bind(JSON.stringify(report)).run();
    assert.equal((await expandAdvice({DB:f.binding}, 99)).status, 409);
    assert.deepEqual((await (await expandAdvice({DB:f.binding},123)).json()).report,report);
  } finally {await f.close();}
});
test("栏目分析必须覆盖输入的每一栏，按页面顺序回填真实标题", async () => {
  const {sectionResults} = await import("../src/site-review/section-advice.ts");
  const sections = [{heading:"简历评审",body:"简历正文"}, {heading:"人工面试",body:"面试流程"}];
  const item = {name:"示例",strength:"优势",weakness:"不足",impact:"影响",actions};
  assert.throws(() => sectionResults(sections,{modules:[{index:1,...item}]}));
  const modules = sectionResults(sections,{modules:[{index:1,...item},{index:0,...item}]});
  assert.deepEqual(modules.map(m => m.evidence),["简历评审","人工面试"]);
});
