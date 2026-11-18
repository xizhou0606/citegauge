import { LogIn } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ReportPreview } from "./report-preview";

export function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-box">
        <div className="login-symbol">
          <LogIn />
        </div>
        <h1>登录监测工作台</h1>
        <p className="login-intro">使用管理员账号查看监测问题和采样证据。</p>
        <form id="login-form" method="post" action="/login" className="grid gap-2">
          <Label htmlFor="username">账号</Label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
          />
          <Label htmlFor="password">密码</Label>
          <div className="flex gap-2">
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
            <Button variant="outline" type="button" id="reveal" aria-label="显示密码" aria-pressed="false">
              显示
            </Button>
          </div>
          <p id="login-error" className="text-destructive text-sm" role="alert" hidden></p>
          <Button className="mt-4" type="submit">
            登录工作台
          </Button>
        </form>
      </section>
      <ReportPreview />
    </main>
  );
}
