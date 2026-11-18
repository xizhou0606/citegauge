import { picker } from "../core/picker.js";
import { $, clean } from "../core/ui.js";
function brandLogo(id) {
  return `<img class="brand-logo" src="/vendor/brands/${encodeURIComponent(id)}.svg" width="20" height="20" alt="">`;
}

export function scopeSection({
  platform,
  platforms,
  onPlatform,
  channel,
  monitors,
  active,
  onChannel,
  onMonitor,
}) {
  const items = monitors.filter((m) => m.channel === channel);
  const label = (m) => [m.brand, m.model, m.question].filter(Boolean).join(" · ");
  const frequencies = new Map();
  for (const m of items)
    frequencies.set(label(m), (frequencies.get(label(m)) || 0) + 1);
  const option = (m) => {
    const suffix =
      frequencies.get(label(m)) > 1 ? " · #" + m.id.slice(0, 8) : "";
    return { value: m.id, text: label(m) + suffix };
  };
  $("scope").innerHTML =
    `<div class="scope-title"><div class="platform-mark">${brandLogo(platform.id)}</div>
    <div><h1><span id="scope-heading">监测范围</span></h1><p>${items.length} 个监测项 · ${clean(channel)}</p></div></div>
    <div class="scope-filters"><div class="monitor-picker">平台<div class="dropdown" id="platform-picker"></div></div><nav class="nav nav-pills" aria-label="采样渠道">${platform.channels
      .map(
        (c) => `<button
    data-channel="${clean(c)}" aria-pressed="${channel === c}" class="nav-link ${channel === c ? "active" : ""}">${brandLogo(c === "火山方舟 API" ? "volcengine" : platform.id)}${clean(c)}</button>`,
      )
      .join("")}</nav>
    <div class="monitor-picker">监测项<div class="dropdown" id="monitor"></div></div></div>`;
  picker($("platform-picker"), "选择平台", platforms.map(p => ({ value: p.id, text: p.name })), platform.id, onPlatform);
  picker($("monitor"), "选择监测项", items.map(option), active, onMonitor, "暂无监测项");
  for (const b of $("scope").querySelectorAll("[data-channel]"))
    b.onclick = () => onChannel(b.dataset.channel);
}
