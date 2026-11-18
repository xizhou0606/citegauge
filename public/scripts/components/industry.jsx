import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageShot, Source } from "./industry-evidence.jsx";

const rank = {高: 0, 中: 1, 低: 2};

function Tasks({ groups }) {
  return <section className="industry-block">
    <header><h3>本站修改清单</h3><span>{groups.size} 个页面模块</span></header>
    {!groups.size && <p>现有证据尚不足以提出具体修改。</p>}
    {[...groups].map(([target, items]) => <article className="industry-module" key={target}>
      <h4>{target}<Badge variant="secondary">{items[0].change.priority}优先级</Badge></h4>
      <p className="industry-original"><b>本站现状</b>{items[0].change.evidence}</p>
      {items.map(({name, change, url}) => <div key={name} className="industry-task">
        <p><strong>对照差距</strong>{change.gap} <a href={url} target="_blank" rel="noreferrer">{name} ↗</a></p>
        <div className="industry-action"><strong>建议修改</strong><p>{change.action}</p>
          {change.example && <blockquote><b>修改示例</b>{change.example}</blockquote>}
        </div>
        <p><strong>验收方式</strong>{change.verify}</p>
      </div>)}
    </article>)}
  </section>;
}

export function Industry({ industry, screenshot, url, onAnalyze, onExpand }) {
  const rows = industry?.rows || [];
  const [selected, select] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const active = rows.find(r => r.name === selected) || rows[0];
  const groups = new Map();
  const changes = rows.filter(r => r.change).sort((a,b) => rank[a.change.priority] - rank[b.change.priority]);
  for (const row of changes) {
    if (!groups.has(row.change.target)) groups.set(row.change.target, []);
    groups.get(row.change.target).push(row);
  }
  async function expand(sources = []) {
    setWorking(true);
    setMessage("正在查找其他品牌并逐页核对来源…");
    try {
      await onExpand(sources);
      setMessage("检索已完成。");
    } catch (e) { setMessage(e.message); }
    finally { setWorking(false); }
  }
  const preview = industry?.preview;
  return <section className="industry-report" aria-label="行业竞品与官网修改建议">
    <header className="industry-intro">
      <div><h2>行业竞品与官网修改建议</h2><p>{industry?.category || "行业对比"}</p></div>
      <div className="industry-buttons">
        {onExpand && <Button disabled={working} onClick={() => expand()}>{working ? "检索中…" : "扩展竞品清单"}</Button>}
        {onAnalyze && <Button variant="outline" onClick={onAnalyze}>重新分析官网</Button>}
      </div>
    </header>
    {message && <p role="status">{message}</p>}
    <section className="industry-block">
      <header><h3>行业品牌清单</h3><span>已核实 {rows.length} 家</span></header>
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
          {rows.map(r => <button key={r.name} type="button" aria-pressed={active.name === r.name}
            onClick={() => select(r.name)}>{r.name}</button>)}
        </div>
        <div className="industry-selected"><h4>{active.name}</h4><p>{active.segment}</p><Source row={active} /></div>
      </>}
    </section>
    {(screenshot || industry?.screenshot || preview) && <section className="industry-block">
      <header><h3>页面截图对照</h3></header>
      <div className="industry-images">
        <PageShot image={screenshot || industry?.screenshot} url={url || industry?.url} label="本站官网首屏" />
        {preview && <PageShot image={preview.image} url={preview.url} label={preview.name + " · 对照来源页"} />}
      </div>
    </section>}
    {!!rows.length && <Tasks groups={groups} />}
  </section>;
}
