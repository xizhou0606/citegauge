import { BrandQuestions } from "./brand-questions.jsx";
import { Industry } from "./industry.jsx";
import { useRef, useState } from "react";
import { Tabs } from "radix-ui";
import { ArrowUpRight, BookOpen, CodeXml, Download, Expand, Layers, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SmallButton } from "./controls.jsx";
import { ReviewModules } from "./review-modules.jsx";
import { Monitor } from "./review-monitor.jsx";
import { ReviewPrompt } from "./review-prompt.jsx";
import { downloadMarkdown, reviewDocument } from "./review-export.js";

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
  const tabBar = useRef(null);
  const host = new URL(report.url).hostname;
  const brand = report.identity?.brand || report.monitor?.brand || report.title || host;
  function showPrompt(index) {
    setScope(String(index));
    setView("prompt");
    tabBar.current.querySelector('[data-reader="prompt"]').focus();
    tabBar.current.scrollIntoView({ block: "start" });
  }
  return (
    <article className="review-reader">
      <header className="reader-heading">
        <div>
          <p className="reader-kicker">官网分析报告</p>
          <h1 tabIndex={-1}>{brand}</h1>
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
              官网诊断
            </Tabs.Trigger>
            {!report.monitor && <Tabs.Trigger value="industry"><Layers size={16} />竞品对比</Tabs.Trigger>}
            {report.monitor && <Tabs.Trigger value="questions">客户搜索问题</Tabs.Trigger>}
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
              <h2>品牌形象</h2>
              {report.identity?.category && <strong className="brand-category">{report.identity.category}</strong>}
              <p>{report.impression}</p>
              {report.identity?.evidence && <blockquote className="brand-evidence"><strong>品牌识别依据</strong>{report.identity.evidence}</blockquote>}
            </div>
            <Screenshot report={report} />
          </section>
          <ReviewModules modules={report.modules} showPrompt={showPrompt} onExpand={onExpand} />
          <Monitor report={report} actions={actions} />
        </Tabs.Content>
        {report.monitor && <Tabs.Content value="questions"><BrandQuestions domain={report.monitor.domain} at={report.at} /></Tabs.Content>}
        <Tabs.Content value="industry">
          <Industry industry={report.industry} screenshot={report.screenshot} url={report.url}
            onExpand={report.identity ? onIndustry : undefined} />
        </Tabs.Content>
        <Tabs.Content value="prompt">
          <ReviewPrompt report={report} scope={scope} choose={setScope} />
        </Tabs.Content>
      </Tabs.Root>
    </article>
  );
}
