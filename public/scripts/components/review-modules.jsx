import { useState } from "react";
import { CheckCircle2, CircleAlert, CodeXml } from "lucide-react";
import { Disclosure, SmallButton } from "./controls.jsx";
import { ModuleAdvice } from "./module-advice.jsx";
import { WorkspaceSelect } from "./workspace-select.jsx";

function Findings({ module }) {
  return <div className="module-findings">
    <section className="finding strength"><h4><CheckCircle2 size={17} />优势</h4>
      <p>{module.strength || "这份报告尚未记录本模块的优势。"}</p></section>
    <section className="finding weakness"><h4><CircleAlert size={17} />不足</h4>
      <p>{module.weakness || "这份报告尚未记录本模块的不足。"}</p></section>
  </div>;
}

export function ReviewModules({ modules, showPrompt, onExpand }) {
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const current = modules[index] ? index : 0;
  const m = modules[current];
  if (!m) return null;
  async function expand() {
    setBusy(true);
    setMessage("正在根据报告依据细化各模块的修改建议…");
    try { await onExpand(); setMessage(""); }
    catch (e) { setMessage(e.message); }
    finally { setBusy(false); }
  }
  return <section className="module-review" aria-labelledby="modules-title">
    <header className="module-review-title"><h2 id="modules-title">官网模块分析</h2><span>{modules.length} 个模块</span></header>
    <div className="module-layout">
      <nav className="module-picker" aria-label="选择官网模块">
        <h3>页面目录</h3>
        <ol>{modules.map((item, i) => <li key={i}><button type="button"
          aria-pressed={current === i} aria-controls="module-detail" onClick={() => setIndex(i)}>
          <span>{String(i + 1).padStart(2, "0")}</span>{item.name}
        </button></li>)}</ol>
        <div className="module-select"><label htmlFor="module-choice">选择官网模块</label>
          <WorkspaceSelect id="module-choice" value={String(current)} wide
            options={modules.map((item, i) => ({value: String(i), label: (i + 1) + ". " + item.name}))}
            onChange={value => setIndex(Number(value))} />
        </div>
      </nav>
      <article className="reader-module" id="module-detail" aria-labelledby="current-module" key={current}>
        <header><small>模块 {current + 1} / {modules.length}</small><h3 id="current-module">{m.name}</h3></header>
        <Findings module={m} />
        {m.evidence && <blockquote><strong>{m.source === "截图" ? "首屏截图依据" : "官网原文依据"}</strong>{m.evidence}</blockquote>}
        {m.impact && <p className="module-impact"><strong>对访客的影响</strong>{m.impact}</p>}
        <Disclosure className="module-steps" title={<>修改建议{m.actions?.length ? " · " + m.actions.length + " 项" : ""}</>}>
          {m.change && <p><strong>修改步骤</strong>{m.change}</p>}
          {m.acceptance && <p><strong>验收条件</strong>{m.acceptance}</p>}
          <ModuleAdvice actions={m.actions} />
          {!m.actions?.length && <SmallButton onClick={expand} disabled={busy}>生成详细修改清单</SmallButton>}
          <SmallButton onClick={() => showPrompt(current)}><CodeXml />查看本模块提示词</SmallButton>
        </Disclosure>
        {message && <p role="status">{message}</p>}
      </article>
    </div>
  </section>;
}
