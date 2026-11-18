import test from "node:test";
import assert from "node:assert/strict";
import { answerReferences } from "../src/domain/answer-references.ts";
import { markdown } from "../public/scripts/core/markdown.js";

test("回答按 Markdown 排版，正文角标只关联唯一且已核实的原始编号", () => {
  const body="## 结论\n\n- **方案** [ref_7] [ref_1] [ref_5] [ref_9]\n\n| 产品 | 依据 |\n|---|---|\n| B | 正文 |\n\n`[ref_7]` <script>alert(1)</script>";
  const refs=answerReferences(body,[
    {index:7,title:'A "产品"',url:"https://a.example/"},{index:2,url:"https://unused.example"},
    {index:1,url:"javascript:alert(1)"},{index:5,url:"https://one.example"},{index:5,url:"https://two.example"},
  ]);
  assert.equal(refs.length,1);
  const html=markdown(body,refs);
  for(const tag of ["<h2>","<ul>","<strong>","<table ","<code>[ref_7]</code>"]) assert.ok(html.includes(tag));
  assert.equal((html.match(/class="answer-citation"/g)||[]).length,1);
  assert.match(html,/href="https:\/\/a.example\/"/); assert.match(html,/\[ref_5\]/);
  assert.ok(!html.includes("<script>") && !html.includes("javascript:"));
  assert.match(markdown("[文档][id]\n\n[id]: https://docs.example/"),/href="https:\/\/docs.example\/"/);
});
