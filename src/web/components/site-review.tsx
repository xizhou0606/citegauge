import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Button } from "../../components/ui/button";

export function WebsiteInput() {
  return (
    <>
      <Label htmlFor="website-url" className="mb-2">
        官网网址
      </Label>
      <div className="site-input">
        <Input
          id="website-url"
          name="website"
          inputMode="url"
          autoComplete="url"
          placeholder="https://example.com"
          maxLength={2048}
          required
        />
        <Button type="submit">分析官网</Button>
      </div>
    </>
  );
}
export function WebsitePanel() {
  return (
    <section id="website-panel" aria-labelledby="website-title">
      <h1 id="website-title">官网形象分析</h1>
      <p className="text-muted-foreground my-3">
        输入官网网址，AI 会从首屏和正文识别品牌，按模块给出修改建议，并自动创建监测问题、发起首次采样。
      </p>
      <form id="website-form">
        <WebsiteInput />
      </form>
      <p id="website-status" role="status" aria-live="polite"></p>
      <div id="website-result"></div>
    </section>
  );
}
