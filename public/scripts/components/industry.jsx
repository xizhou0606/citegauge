import { useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { BrandAdvice, BrandScreenshot } from "./brand-comparison.jsx";
import { Button } from "@/components/ui/button";
import { rankedBrands } from "./industry-rank.js";
import { PageShot, Source } from "./industry-evidence.jsx";

export function Industry({ industry, screenshot, url, onAnalyze, onExpand }) {
  const heading = useRef(null);
  const rows = rankedBrands(industry?.rows || []);
  const [selected, select] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const active = rows.find(r => r.name === selected) || rows[0];
  async function expand(sources = []) {
    setWorking(true);
    setMessage("正在查找其他品牌并逐页核对来源…");
    try {
      await onExpand(sources);
      setMessage("检索已完成。");
    } catch (e) { setMessage(e.message); }
    finally { setWorking(false); }
  }
  const site = url || industry?.url;
  const saved = active && industry?.preview?.name === active.name && industry.preview.url === active.url ? industry.preview : null;
  return <section className="industry-report" aria-label="行业竞品与官网修改建议">
    <header className="industry-intro">
      <div><h2>行业竞品与官网修改建议</h2><p>{industry?.category || "行业对比"}</p></div>
      <div className="industry-buttons">
        {active?.change && <Button variant="outline" onClick={() => {
          heading.current?.focus({preventScroll: true});
          heading.current?.scrollIntoView({block: "start"});
        }}>查看 {active.name} 的改法</Button>}
        {onExpand && <Button disabled={working} onClick={() => expand()}>{working ? "检索中…" : "扩展竞品清单"}</Button>}
        {onAnalyze && <Button variant="outline" onClick={onAnalyze}>重新分析官网</Button>}
      </div>
    </header>
    {message && <p role="status">{message}</p>}
    <section className="industry-block">
      <header><h3>行业品牌清单</h3><span>已核实 {rows.length} 家</span></header>
      {!!rows.length && <p>对标排名按采购替代关系排序：直接竞品、细分替代、关系待核实。同类按本站修改优先级从高到低排列，同级按品牌名排序。</p>}
      <p>{industry?.note || "当前官网还没有行业检索报告。"}</p>
      {!!industry?.queries?.length && <details className="industry-queries"><summary>查看检索范围</summary>
        <ul>{industry.queries.map(q => <li key={q}>{q}</li>)}</ul></details>}
      {onExpand && <details className="industry-queries"><summary>补充已知产品页</summary>
        <label className="block my-2">每行一个公开网址，最多 12 个
          <Textarea value={sourceText} onChange={e => setSourceText(e.target.value)} />
        </label>
        <Button size="sm" variant="outline" disabled={working || !sourceText.trim()}
          onClick={() => expand(sourceText.trim().split(/\s+/))}>核对这些来源</Button>
      </details>}
      {!!active && <>
        <div className="industry-names" role="group" aria-label="选择品牌查看依据">
          {rows.map((r, index) => <button key={r.name} type="button" aria-pressed={active.name === r.name}
            onClick={() => select(r.name)}><span className="brand-rank">{index + 1}</span> {r.name}</button>)}
        </div>
        <div className="industry-selected"><h4>第 {rows.indexOf(active) + 1} 名 · {active.name}</h4><small>{active.relation || "关系待核实"} · {active.change?.priority ? active.change.priority + "修改优先级" : "待补充修改依据"}</small><p>{active.segment}</p><Source row={active} /></div>
      </>}
    </section>
    {active && <section className="industry-block">
      <header><h3>本站与 {active.name} 的页面截图</h3></header>
      <div className="industry-images">
        <PageShot image={screenshot || industry?.screenshot} url={url || industry?.url} label="本站官网首屏" />
        <BrandScreenshot key={JSON.stringify([site, active.name, active.url])} row={active} site={site} saved={saved} />
      </div>
    </section>}
    {active && <BrandAdvice row={active} heading={heading} />}
  </section>;
}
