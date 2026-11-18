import { Industry } from "./industry.jsx";
import { useRef, useState } from "react";
import { Tabs } from "radix-ui";
import { ArrowUpRight, BookOpen, CodeXml, Download, Expand, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmallButton } from "./controls.jsx";
import { ModuleAdvice } from "./module-advice.jsx";
import { Monitor } from "./review-monitor.jsx";
import { ReviewPrompt } from "./review-prompt.jsx";
import { downloadMarkdown, moduleFields, reviewDocument } from "./review-export.js";

function Screenshot({ report }) {
  if (!report.screenshot) return null;
  const image = "data:image/jpeg;base64," + report.screenshot;
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="review-shot" type="button" aria-label="放大查看首屏截图">
          <img src={image} alt="分析时的官网首屏" />
          <span>
            <Expand size={14} />
            查看首屏
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[92dvh] overflow-auto" aria-describedby={undefined}>
        <DialogTitle>官网首屏截图</DialogTitle>
        <img src={image} alt="分析时抓取的完整首屏" />
      </DialogContent>
    </Dialog>
  );
}
export function SiteReport({ report, actions, onAnalyze, onExpand, onIndustry }) {
  const [view, setView] = useState("report"),
    [scope, setScope] = useState("all");
  const [expanding, setExpanding] = useState(false);
  const [detailNote, setDetailNote] = useState("");
  const tabBar = useRef(null);
  const host = new URL(report.url).hostname;
  const brand = report.monitor?.brand || report.identity?.brand || report.title || host;
  function showPrompt(index) {
    setScope(String(index));
    setView("prompt");
    tabBar.current.querySelector('[data-reader="prompt"]').focus();
    tabBar.current.scrollIntoView({ block: "start" });
  }
  function jump(id) {
    const heading = document.getElementById(id);
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: "start" });
  }
  return (
    <article className="review-reader">
      <header className="reader-heading">
        <div>
          <p className="reader-kicker">官网分析报告</p>
          <h1>{brand}</h1>
          <div className="reader-meta">
            <a href={report.url} target="_blank" rel="noreferrer">
              {host} <ArrowUpRight size={14} />
            </a>
            <time dateTime={new Date(report.at).toISOString()}>
              {new Date(report.at).toLocaleString("zh-CN", { hour12: false })}
            </time>
          </div>
        </div>
        <SmallButton onClick={onAnalyze}>
          <Plus />
          发起新分析
        </SmallButton>
      </header>
      <Tabs.Root value={view} onValueChange={setView}>
        <div className="reader-toolbar" ref={tabBar}>
          <Tabs.List aria-label="报告阅读视图" className="reader-tabs">
            <Tabs.Trigger value="report">
              <BookOpen size={16} />
              分析报告
            </Tabs.Trigger>
            <Tabs.Trigger value="prompt" data-reader="prompt">
              <CodeXml size={16} />
              AI 修改提示词
            </Tabs.Trigger>
          </Tabs.List>
          {view === "report" && (
            <SmallButton
              variant="ghost"
              onClick={() => downloadMarkdown(host + "-官网报告.md", reviewDocument(report))}
            >
              <Download />
              下载报告
            </SmallButton>
          )}
        </div>
        <Tabs.Content value="report" forceMount hidden={view !== "report"}>
          <section className="reader-summary">
            <div>
              <h2>整体形象</h2>
              <p>{report.impression}</p>
            </div>
            {!report.industry?.rows.length && <Screenshot report={report} />}
          </section>
          <Industry industry={report.industry} screenshot={report.industry?.rows.length ? report.screenshot : null} url={report.url} onExpand={report.identity ? onIndustry : undefined} />
          <div className="reader-columns">
            <div className="reader-body">
              <h2>
                模块修改建议 <span>{report.modules.length}</span>
              </h2>
              {report.modules.some((m) => !m.actions?.length) && (
                <div className="expand-advice">
                  <SmallButton
                    disabled={expanding}
                    onClick={async () => {
                      setExpanding(true);
                      setDetailNote("正在按原报告证据细化各模块建议…");
                      try {
                        await onExpand();
                        setDetailNote("");
                      } catch (e) {
                        setDetailNote(e.message);
                      } finally {
                        setExpanding(false);
                      }
                    }}
                  >
                    生成详细修改清单
                  </SmallButton>
                  <small role="status">{detailNote}</small>
                </div>
              )}
              {report.modules.map((m, i) => (
                <section className="reader-module" key={i}>
                  <h3 id={"review-module-" + i} tabIndex={-1}>
                    {m.name}
                  </h3>
                  <blockquote>
                    <strong>{m.source === "截图" ? "首屏观察" : "页面原文"}</strong>
                    {m.evidence}
                  </blockquote>
                  <dl>
                    {moduleFields
                      .filter(([key]) => m[key])
                      .map(([key, label]) => (
                        <div key={key}>
                          <dt>{label}</dt>
                          <dd>{m[key]}</dd>
                        </div>
                      ))}
                  </dl>
                  <ModuleAdvice actions={m.actions} />
                  <SmallButton variant="outline" onClick={() => showPrompt(i)}>
                    <CodeXml />
                    查看本模块提示词
                  </SmallButton>
                </section>
              ))}
            </div>
            <aside className="reader-aside">
              <nav aria-label="模块目录">
                <h3>模块目录</h3>
                {report.modules.map((m, i) => (
                  <button key={i} onClick={() => jump("review-module-" + i)}>
                    {m.name}
                  </button>
                ))}
              </nav>
              <Monitor report={report} actions={actions} />
            </aside>
          </div>
        </Tabs.Content>
        <Tabs.Content value="prompt">
          <ReviewPrompt report={report} scope={scope} choose={setScope} />
        </Tabs.Content>
      </Tabs.Root>
    </article>
  );
}
