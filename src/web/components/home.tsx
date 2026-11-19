import { ArrowUpRight, BookOpen, ChartColumn, Layers, type LucideIcon } from "lucide-react";
import { WebsiteInput } from "./site-review";
import { articles } from "../articles";
import { ReportPreview } from "./report-preview";
const icons: Record<string, LucideIcon> = { "/methodology": ChartColumn, "/channels": Layers };
export function Home() {
  return (
    <main className="public-main">
      <section className="hero">
        <img className="coast-art" src="/art/citegauge-coast.webp" alt="" fetchPriority="high" />
        <div className="intro">
          <h1>
            你的品牌，
            <br />
            <em>AI 看得见吗？</em>
          </h1>
          <p>
            输入官网，看看 AI 如何理解你的品牌、推荐了哪些竞品，以及哪些页面值得改进。
          </p>
          <form id="site-entry" action="/workspace" method="get">
            <WebsiteInput />
          </form>
          <div className="actions">
            <a className="text-action" href="/workspace#monitoring">
              进入可见度概览
            </a>
            <a className="text-action" href="/methodology">
              查看监测方法
            </a>
          </div>
        </div>
      </section>
      <div className="public-lower">
      <ReportPreview />
      <section className="resources">
        <h2>使用指南</h2>
        <div className="guides">
          {Object.entries(articles).map(([path, article]) => {
            const Icon = icons[path] || BookOpen;
            return (
              <a className="guide-card" href={path} key={path}>
                <span className="guide-icon">
                  <Icon />
                </span>
                <div>
                  <h3>{article.title}</h3>
                  <p>{article.summary}</p>
                </div>
                <ArrowUpRight />
              </a>
            );
          })}
        </div>
      </section>
      </div>
    </main>
  );
}
