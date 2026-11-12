import { $, clean, icon } from "../core/ui.js";
export function platformNav(platforms, monitors, platform, select) {
  $("platforms").innerHTML = platforms
    .map((p) => {
      const count = monitors.filter((m) =>
        p.channels.includes(m.channel),
      ).length;
      return `<button class="platform-nav" aria-label="${clean(p.name)}，${count} 个监测项" data-platform="${clean(p.id)}" aria-pressed="${p.id === platform.id}">
      <i>${icon(p.id === "doubao" ? "cloud" : "cpu")}</i>${clean(p.name)}<small>${count}</small></button>`;
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
  $("crumb").textContent = platform.name;
  const items = monitors.filter((m) => m.channel === channel);
  const label = (m) => [m.brand, m.model, m.question].filter(Boolean).join(" · ");
  const frequencies = new Map();
  for (const m of items)
    frequencies.set(label(m), (frequencies.get(label(m)) || 0) + 1);
  const option = (m) => {
    const suffix =
      frequencies.get(label(m)) > 1 ? " · #" + m.id.slice(0, 8) : "";
    return `<option value="${clean(m.id)}" ${m.id === active ? "selected" : ""}>${clean(label(m) + suffix)}</option>`;
  };
  $("scope").innerHTML =
    `<div class="scope-title"><div class="platform-mark">${icon(platform.id === "doubao" ? "cloud" : "cpu")}</div>
    <div><h1>${clean(platform.name)}监测概览</h1><p>品牌可见度与引用分析</p></div></div>
    <div class="scope-filters"><nav class="nav nav-pills" aria-label="采样渠道">${platform.channels
      .map(
        (c) => `<button
    data-channel="${clean(c)}" aria-pressed="${channel === c}" class="nav-link ${channel === c ? "active" : ""}">${icon(c.endsWith("API") ? "cpu" : "globe2")}${clean(c)}</button>`,
      )
      .join("")}</nav>
    <label class="monitor-picker">监测项<select class="form-select form-select-sm" id="monitor" ${items.length ? "" : "disabled"}>
    ${items.map(option).join("") || "<option>暂无监测项</option>"}</select></label></div>`;
  for (const b of $("scope").querySelectorAll("[data-channel]"))
    b.onclick = () => onChannel(b.dataset.channel);
  $("monitor").onchange = (e) => onMonitor(e.target.value);
}
