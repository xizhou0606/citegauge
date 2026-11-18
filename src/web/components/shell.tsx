import {
  Activity,
  AudioLines,
  BookOpen,
  ChartColumn,
  FolderOpen,
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
export function PublicHeader({ login }: { login: boolean }) {
  return (
    <header className="public-header">
      <Brand />
      <nav className="flex" aria-label="主导航">
        <a href="/methodology">监测方法</a>
        <a href="/channels">采样渠道</a>
        <a href={repo}>GitHub ↗</a>
      </nav>
      {!login && (
        <Button asChild>
          <a href="/workspace">进入工作台</a>
        </Button>
      )}
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
const views = [
  ["website", Globe, "官网分析"],
  ["monitoring", Activity, "可见度概览"],
  ["competitors", ChartColumn, "竞品对比"],
  ["sources", Link2, "引用来源"],
  ["evidence", FolderOpen, "样本复核"],
] as const;
export function WorkspaceShell() {
  return (
    <div className="console">
      <aside className="rail">
        <Brand />
        <div className="rail-section">工作台</div>
        <nav className="feature-nav" aria-label="工作台功能">
          {views.map(([id, Icon, label]) => (
            <Button asChild variant="ghost" key={id}>
              <a className="feature-link" href={"#" + id}>
                <Icon />
                {label}
              </a>
            </Button>
          ))}
        </nav>
        <div className="rail-foot">
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
            工作台 <span>/</span> <strong id="crumb">官网分析</strong>
          </div>
          <div id="tools" hidden>
            <Button id="add" size="sm">
              <Plus />
              新建监测项
            </Button>
          </div>
        </header>
        <div className="content">
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
