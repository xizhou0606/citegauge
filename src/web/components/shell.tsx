import {
  Activity,
  Building2,
  Menu,
  ChartNoAxesCombined,
  AudioLines,
  BookOpen,
  ChartColumn,
  Globe,
  Layers,
  Link2,
  LogOut,
  Plus,
  CodeXml,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { WebsitePanel } from "./site-review";
export const repo = "https://github.com/xizhou0606/citegauge";
function Brand() {
  return (
    <a className="brand" href="/">
      <i>
        <AudioLines />
      </i>
      <b>CiteGauge</b>
      <span>引迹</span>
    </a>
  );
}
export function PublicHeader() {
  return (
    <header className="public-header">
      <Brand />
      <nav className="flex" aria-label="主导航">
        <a href="/methodology">监测方法</a>
        <a href="/channels">采样渠道</a>
        <a href={repo}>GitHub ↗</a>
      </nav>
      <Button asChild>
        <a href="/workspace">进入工作台</a>
      </Button>
    </header>
  );
}
export function PublicFooter() {
  return (
    <footer className="public-footer">
      <Brand />
      <a href="/about">关于项目</a>
      <a href={repo}>MIT · GitHub ↗</a>
    </footer>
  );
}
const viewGroups = [
  { id: "seo", label: "SEO · 官网优化", views: [
    ["website", Globe, "官网分析"],
    ["competitors", ChartColumn, "竞品对比"],
  ] },
  { id: "geo", label: "GEO · AI 可见度", views: [
    ["monitoring", Activity, "可见度概览"],
    ["sources", Link2, "回答与引用"],
  ] },
  { id: "traffic", label: "PV / UV", views: [
    ["traffic", ChartNoAxesCombined, "网站流量"],
  ] },
] as const;
export function WorkspaceShell({tenant,operator}: {tenant?:string;operator?:boolean} = {}) {
  return (
    <div className="console">
      <aside className="rail">
        <Brand />
        <Button className="rail-menu-toggle" id="rail-menu-toggle" variant="ghost" aria-expanded="false" aria-controls="rail-tools">
          <Menu size={17} />更多
        </Button>
        <nav className="feature-nav" aria-label="工作台功能">
          {viewGroups.map(({ id, label, views }) => (
            <section className="feature-group" key={id} aria-labelledby={`nav-${id}`}>
              <h2 className="feature-heading" id={`nav-${id}`}>{label}</h2>
              <div className="feature-items">
                {views.map(([view, Icon, name]) => (
                  <Button asChild variant="ghost" key={view}>
                    <a className="feature-link" href={"#" + view}>
                      <Icon aria-hidden="true" />
                      {name}
                    </a>
                  </Button>
                ))}
              </div>
            </section>
          ))}
        </nav>
        <div className="rail-foot" id="rail-tools">
          <a href="/methodology">
            <BookOpen />
            监测方法
          </a>
          <a href="/channels">
            <Layers />
            采样渠道
          </a>
          <a href={repo}>
            <CodeXml />
            GitHub
          </a>
          <Button variant="ghost" id="lock" hidden>
            <LogOut />
            退出登录
          </Button>
        </div>
      </aside>
      <main className="console-main">
        <header className="topbar">
          <div>
            {tenant || "工作台"} <span>/</span> <strong id="crumb">官网分析</strong>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {operator && <Button asChild variant="outline" size="sm">
              <a href="/admin/projects"><Building2 />租户管理</a>
            </Button>}
            <div id="tools" hidden>
              <Button id="add" size="sm">
                <Plus />
                添加监测网站
              </Button>
            </div>
          </div>
        </header>
        <div className="content">
          <div id="website-scope"></div>
          <WebsitePanel />
          <p id="status" role="status" aria-live="polite"></p>
          <div id="app" hidden>
            <div id="scope"></div>
            <div id="panel"></div>
          </div>
        </div>
      </main>
    </div>
  );
}
