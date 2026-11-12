import { $, action, status } from "./core/ui.js";
import { api, requestJSON } from "./core/api.js";
import { platformNav, scopeSection } from "./components/scope.js";
import { renderDashboard } from "./components/dashboard.js";
import { newMonitor } from "./components/monitor-form.js";

let catalog, platform, channel, active;
function create(self = false) {
  newMonitor({ platforms: catalog.platforms, models: catalog.models, channel, self, onSave: load });
}
async function select(p, c, id) {
  platform = p;
  channel = c;
  const matches = catalog.monitors.filter((m) => m.channel === channel);
  const monitor = matches.find((m) => m.id === id) || matches[0];
  active = monitor?.id;
  sessionStorage.setItem(
    "cg-selection",
    JSON.stringify({ platform: p.id, channel, id: active }),
  );
  platformNav(catalog.platforms, catalog.monitors, p, (platformId) => {
    const next = catalog.platforms.find((x) => x.id === platformId);
    const available = catalog.monitors.find((m) =>
      next.channels.includes(m.channel),
    );
    select(next, available?.channel || next.channels[0], available?.id).catch(
      (e) => status(e.message),
    );
  });
  scopeSection({
    platform,
    channel,
    active,
    monitors: catalog.monitors,
    onChannel: (c) => select(platform, c).catch((e) => status(e.message)),
    onMonitor: (id) =>
      select(platform, channel, id).catch((e) => status(e.message)),
  });
  await renderDashboard(
    monitor,
    catalog.ready[channel],
    () => load(active),
    () => create(),
  );
}
async function load(id) {
  catalog = await api("state?catalog=1");
  for (const el of ["app", "tools", "lock"]) $(el).hidden = false;
  let previous = {};
  try {
    previous = JSON.parse(sessionStorage.getItem("cg-selection")) || {};
  } catch {}
  const m = catalog.monitors.find((item) => item.id === (id || previous.id));
  const p =
    catalog.platforms.find((x) =>
      m ? x.channels.includes(m.channel) : x.id === previous.platform,
    ) ||
    catalog.platforms.find((x) =>
      x.channels.includes(catalog.monitors[0]?.channel),
    ) ||
    catalog.platforms[0];
  const c =
    m?.channel ||
    (p.channels.includes(previous.channel) ? previous.channel : p.channels[0]);
  await select(p, c, m?.id);
}
$("lock").onclick = action(async () => {
  await requestJSON("/api/auth/sign-out", {});
  location.replace("/login");
});
window.addEventListener("session-expired", () => {
  location.replace("/login");
});
$("add").onclick = () => create();
$("self").onclick = () => create(true);
sessionStorage.removeItem("cg-token");
load().catch((error) => status(error.message));
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
