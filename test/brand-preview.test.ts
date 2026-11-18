import assert from "node:assert/strict";
import test from "node:test";
import { brandPreview } from "../src/site-review/brand-preview.ts";
import { rankedBrands } from "../public/scripts/components/industry-rank.js";
import { fixture } from "./d1-fixture.ts";

test("对标优先级按采购替代关系、修改优先级和名称排序，兼容旧报告", () => {
  const peers = [
    { name: "D", relation: "细分替代", change: {priority: "高"} }, {name: "E"},
    { name: "B", relation: "直接竞品", change: {priority: "高"} },
    { name: "C", relation: "直接竞品", change: {priority: "中"} },
    { name: "A", relation: "直接竞品", change: {priority: "高"} },
  ];
  assert.equal(rankedBrands(peers).map(r => r.name).join(""), "ABCDE");
  assert.equal(peers[0].name, "D");
});

test("品牌截图按已核实的名称与来源配对，首次抓取后回读缓存", async () => {
  const f = await fixture();
  try {
    const a = {name:"A", url:"https://a.example.com/"}, b = {name:"B", url:"https://b.example.com/"};
    await f.binding.prepare("INSERT INTO industry_reviews VALUES ('example.com',1,?1)")
      .bind(JSON.stringify({rows:[a,b]})).run();
    const calls = [];
    const env = {DB:f.binding, BROWSER:{quickAction:async (_, {url}) => {
      calls.push(url);
      return Response.json({success:true, meta:{finalUrl:url,status:200,title:"产品"},
        result:{screenshot:url === a.url ? "/9j/aaaa" : "/9j/bbbb"}});
    }}};
    const read = (brand,source,site="https://example.com") => brandPreview(new Request("https://app.example.com/api/industry-preview",
      {method:"POST",body:JSON.stringify({site,brand,source})}),env);
    assert.equal((await read(a.name,b.url)).status,404);
    assert.equal((await read(a.name,a.url,"other.example.com")).status,404);
    for (const row of [a,b,a]) {
      const {preview} = await (await read(row.name,row.url)).json();
      assert.equal(preview.name,row.name);
      assert.equal(preview.image,row === a ? "/9j/aaaa" : "/9j/bbbb");
    }
    assert.deepEqual(calls,[a.url,b.url]);
  } finally {await f.close();}
});
