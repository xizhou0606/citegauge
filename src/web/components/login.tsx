import { ArrowRight, AudioLines, Eye, EyeOff, KeyRound, LoaderCircle, Pause, Play, UserRound } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { repo } from "./shell";

function SignalPanel() {
  return (
    <aside className="signal-panel" aria-label="引迹品牌监测">
      <a href="/" className="login-brand">
        <AudioLines aria-hidden="true" /><strong>CiteGauge</strong><span>引迹</span>
      </a>
      <div className="signal-title">追踪品牌在<br /><em>AI 回答</em>中的引用</div>
      <canvas id="signal-field" aria-hidden="true" />
      <div className="signal-caption">
        <span><i />采样信号示意</span>
        <Button type="button" size="icon" variant="ghost" id="signal-motion" aria-label="暂停动画" hidden>
          <Pause className="motion-pause" /><Play className="motion-play" />
        </Button>
      </div>
    </aside>
  );
}

export function LoginPage() {
  return (
    <main className="login-page">
      <SignalPanel />
      <section className="login-content" aria-labelledby="login-heading">
        <nav className="login-links" aria-label="项目导航">
          <a href="/methodology">监测方法</a>
          <a href="/channels">采样渠道</a>
        </nav>
        <div className="login-box">
          <h1 id="login-heading">登录工作台</h1>
          <p className="login-intro">使用企业账号查看所属网站的监测结果与采样证据。</p>
          <form id="login-form" method="post" action="/login">
            <div className="login-field">
              <Label htmlFor="username">账号</Label>
              <div className="login-control">
                <UserRound aria-hidden="true" />
                <Input id="username" name="username" autoComplete="username" autoCapitalize="none"
                  spellCheck={false} placeholder="输入登录账号" required />
              </div>
            </div>
            <div className="login-field">
              <Label htmlFor="password">密码</Label>
              <div className="login-control">
                <KeyRound aria-hidden="true" />
                <Input id="password" name="password" type="password" autoComplete="current-password"
                  placeholder="输入密码" required />
                <Button variant="ghost" size="icon" type="button" id="reveal" aria-label="显示密码" aria-pressed="false">
                  <Eye /><EyeOff />
                </Button>
              </div>
            </div>
            <p id="login-error" role="alert" hidden></p>
            <Button id="login-submit" type="submit">
              <span>登录工作台</span><ArrowRight /><LoaderCircle />
            </Button>
          </form>
        </div>
        <footer className="login-footer">
          <a href="/about">关于引迹</a>
          <a href={repo}>GitHub ↗</a>
        </footer>
      </section>
    </main>
  );
}
