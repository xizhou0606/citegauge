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
    <section id="website-panel" aria-label="官网分析">
      <div id="website-entry">
        <h1 id="website-title">官网形象分析</h1>
        <p className="text-muted-foreground my-3">
          输入官网网址，查看品牌形象、页面改进建议和 AI 修改提示词。
        </p>
        <form id="website-form">
          <WebsiteInput />
        </form>
      </div>
      <p id="website-status" role="status" aria-live="polite"></p>
      <div id="website-result"></div>
    </section>
  );
}
