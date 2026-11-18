import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";

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
export function Scope({
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
          <h1>{title}</h1>
          <p>
            {items.length} 个监测项 · {channel}
          </p>
        </div>
      </div>
      <div className="scope-filters">
        <div className="monitor-picker">
          <Label htmlFor="platform-picker">平台</Label>
          <NativeSelect id="platform-picker" value={platform.id} onChange={(e) => onPlatform(e.target.value)}>
            {platforms.map((p) => (
              <NativeSelectOption key={p.id} value={p.id}>
                {p.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
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
          <Label htmlFor="monitor">监测项</Label>
          <NativeSelect
            id="monitor"
            value={active || ""}
            disabled={!items.length}
            onChange={(e) => onMonitor(e.target.value)}
          >
            {!items.length && <option value="">暂无监测项</option>}
            {items.map((m) => (
              <option key={m.id} value={m.id}>
                {label(m)}
                {frequencies.get(label(m)) > 1 && " · #" + m.id.slice(0, 8)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
    </>
  );
}
