import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "../core/api.js";
import { PageShot } from "./industry-evidence.jsx";

export function BrandScreenshot({row, site, saved}) {
  const [preview, setPreview] = useState(saved);
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  useEffect(() => {
    if (saved || !site) return;
    let current = true;
    api("industry-preview", {site, brand: row.name, source: row.url}).then(({preview}) => {
      if (current) setPreview(preview);
    }).catch(e => { if (current) setError(e.message); });
    return () => { current = false; };
  }, [site, row.name, row.url, saved, attempt]);
  if (preview) return <PageShot image={preview.image} url={preview.url} label={row.name + " · 对照来源页"} />;
  return <div className="industry-shot-status" role="status"><b>{row.name} · 对照来源页</b>
    <p>{error || (site ? "正在读取该品牌的截图…" : "暂无截图")}</p>
    <a href={row.url} target="_blank" rel="noreferrer">打开品牌来源页 ↗</a>
    {error && <Button size="sm" variant="outline" onClick={() => {setError("");retry(attempt + 1);}}>重试截图</Button>}
  </div>;
}

export function BrandAdvice({row, heading}) {
  const c = row.change;
  return <section className="industry-block">
    <header><h3 ref={heading} tabIndex={-1}>{row.name} 对标修改建议</h3>
      {c && <Badge variant="secondary">{c.priority}优先级</Badge>}
    </header>
    {c ? <article className="industry-module">
      <h4>{c.target}</h4><p className="industry-original"><b>本站现状</b>{c.evidence}</p>
      <div className="industry-task">
        <p><strong>对照差距</strong>{c.gap} <a href={row.url} target="_blank" rel="noreferrer">{row.name} ↗</a></p>
        <div className="industry-action"><strong>建议修改</strong><p>{c.action}</p>
          {c.example && <blockquote><b>修改示例</b>{c.example}</blockquote>}
        </div>
        <p><strong>验收方式</strong>{c.verify}</p>
      </div>
    </article> : <p>已核实该品牌的业务范围。当前来源尚不足以定位本站的具体修改，可补充该品牌的产品页。</p>}
  </section>;
}
