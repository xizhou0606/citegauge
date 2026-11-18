import { ArrowUpRight, BookOpen, ChartColumn, Layers, type LucideIcon } from "lucide-react";
import { WebsiteInput } from "./site-review";
import { articles } from "../articles";
import { ReportPreview } from "./report-preview";
const icons: Record<string, LucideIcon> = { "/methodology": ChartColumn, "/channels": Layers };
export function Home() {
  return (
    <main className="public-main">
      <section className="hero">
        <div className="intro">
          <h1>
            你的官网，
            <br />
            给人什么印象？
          </h1>
          <p>
            只需一个官网网址。AI
            会识别品牌，逐块分析官网的优势、不足和改法，并自动监测品牌在千问回答中的表现。
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
        <ReportPreview />
      </section>
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
    </main>
  );
}
