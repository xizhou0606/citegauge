import { picker } from "../core/picker.js";
import { $, clean } from "../core/ui.js";
function brandLogo(id) {
  return `<img class="brand-logo" src="/vendor/brands/${encodeURIComponent(id)}.svg" width="20" height="20" alt="">`;
}

export function platformNav(platforms, monitors, platform, select) {
  picker($("platform-picker"), "选择模型平台", platforms.map(p => ({ value: p.id, text: p.name })), platform.id, select);
  $("platforms").innerHTML = platforms
    .map((p) => {
      const count = monitors.filter((m) =>
        p.channels.includes(m.channel),
      ).length;
      return `<button class="nav-link platform-nav" aria-label="${clean(p.name)}，${count} 个监测项" data-platform="${clean(p.id)}" aria-pressed="${p.id === platform.id}">
      ${brandLogo(p.id)}${clean(p.name)}<small>${count}</small></button>`;
    })
    .join("");
  for (const b of $("platforms").querySelectorAll("button"))
    b.onclick = () => select(b.dataset.platform);
}
export function scopeSection({
  platform,
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
    <div><h1>${clean(platform.name)}监测概览</h1><p>${items.length} 个监测项 · ${clean(channel)}</p></div></div>
    <div class="scope-filters"><nav class="nav nav-pills" aria-label="采样渠道">${platform.channels
      .map(
        (c) => `<button
    data-channel="${clean(c)}" aria-pressed="${channel === c}" class="nav-link ${channel === c ? "active" : ""}">${brandLogo(c === "火山方舟 API" ? "volcengine" : platform.id)}${clean(c)}</button>`,
      )
      .join("")}</nav>
    <div class="monitor-picker">监测项<div class="dropdown" id="monitor"></div></div></div>`;
  picker($("monitor"), "选择监测项", items.map(option), active, onMonitor, "暂无监测项");
  for (const b of $("scope").querySelectorAll("[data-channel]"))
    b.onclick = () => onChannel(b.dataset.channel);
}
