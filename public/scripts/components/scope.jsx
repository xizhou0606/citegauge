import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WorkspaceSelect } from "./workspace-select.jsx";

function Logo({ id }) {
  return (
    <img
      className="brand-logo"
      src={"/vendor/brands/" + encodeURIComponent(id) + ".svg"}
      width="20"
      height="20"
      alt=""
    />
  );
}
const descriptions = {
  monitoring: "查看 AI 回答中品牌被提及、官网被引用和明确推荐的频率。",
  competitors: "对照同行官网找出可改进的模块，或比较 AI 回答中的品牌提及。",
  sources: "阅读模型回答，查看正文引用的网页及官网被引情况。",
  evidence: "阅读原始回答，核对引用，并标记 AI 是否明确推荐了品牌。",
};
export function Scope({
  view,
  title,
  platform,
  platforms,
  channel,
  monitors,
  active,
  onPlatform,
  onChannel,
  onMonitor,
}) {
  const items = monitors.filter((m) => m.channel === channel);
  const label = (m) => [m.brand, m.model, m.question].filter(Boolean).join(" · ");
  const frequencies = new Map();
  for (const m of items) frequencies.set(label(m), (frequencies.get(label(m)) || 0) + 1);
  return (
    <>
      <div className="scope-title">
        <div className="platform-mark">
          <Logo id={platform.id} />
        </div>
        <div>
          <h1 tabIndex={-1}>{title}</h1>
          <p>
            {descriptions[view]}
          </p>
        </div>
      </div>
      <div className="scope-filters">
        <div className="monitor-picker">
          <Label htmlFor="platform-picker">平台</Label>
          <WorkspaceSelect
            id="platform-picker"
            value={platform.id}
            onChange={onPlatform}
            options={platforms.map((p) => ({ value: p.id, label: p.name }))}
          />
        </div>
        <nav className="flex flex-wrap gap-1" aria-label="采样渠道">
          {platform.channels.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={channel === c ? "secondary" : "ghost"}
              aria-pressed={channel === c}
              onClick={() => onChannel(c)}
            >
              <Logo id={c === "火山方舟 API" ? "volcengine" : platform.id} />
              {c}
            </Button>
          ))}
        </nav>
        <div className="monitor-picker">
          <Label htmlFor="monitor">监测项（{items.length}）</Label>
          <WorkspaceSelect
            id="monitor"
            value={active}
            onChange={onMonitor}
            wide
            placeholder="暂无监测项"
            options={items.map((m) => {
              const suffix = frequencies.get(label(m)) > 1 ? " · #" + m.id.slice(0, 8) : "";
              return {
                value: m.id,
                label: label(m) + suffix,
                description: [m.brand, m.model].filter(Boolean).join(" · "),
                text: m.question + suffix,
              };
            })}
          />
        </div>
      </div>
    </>
  );
}
