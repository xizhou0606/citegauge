import "./core/validation.js";
import { bindWebsiteReview, openWebsiteEntry } from "./components/site-review.js";
import { $, action, status } from "./core/ui.js";
import { api, requestJSON } from "./core/api.js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { Scope } from "./components/scope.jsx";
import { renderDashboard } from "./components/dashboard.jsx";

const scope = createRoot($("scope"));
let catalog, platform, channel, active;
function showView() {
  const links = [...document.querySelectorAll(".feature-nav a")];
  const current = links.find((link) => link.hash === location.hash) || links[0];
  const view = current.hash.slice(1);
  const monitoring = view !== "website";
  $("website-panel").hidden = monitoring;
  $("app").hidden = !monitoring || !catalog;
  $("tools").hidden = !monitoring || !catalog;
  $("crumb").textContent = current.textContent;
  for (const link of links) {
    if (link === current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  return view;
}
function create() {
  location.hash = "website";
  showView();
  openWebsiteEntry();
}
async function select(p, c, id) {
  platform = p;
  channel = c;
  const matches = catalog.monitors.filter((m) => m.channel === channel);
  const monitor = matches.find((m) => m.id === id) || matches[0];
  active = monitor?.id;
  sessionStorage.setItem("cg-selection", JSON.stringify({ platform: p.id, channel, id: active }));
  await refreshView();
}
async function refreshView() {
  const view = showView();
  if (!catalog || !platform) return;
  scope.render(
    createElement(Scope, {
      title: $("crumb").textContent,
      platform,
      platforms: catalog.platforms,
      onPlatform: (platformId) => {
        const next = catalog.platforms.find((p) => p.id === platformId);
        const first = catalog.monitors.find((m) => next.channels.includes(m.channel));
        select(next, first?.channel || next.channels[0], first?.id).catch((e) => status(e.message));
      },
      channel,
      active,
      monitors: catalog.monitors,
      onChannel: (c) => select(platform, c).catch((e) => status(e.message)),
      onMonitor: (id) => select(platform, channel, id).catch((e) => status(e.message)),
    }),
  );
  await renderDashboard(
    view,
    catalog.monitors.find((m) => m.id === active),
    catalog.ready[channel],
    () => load(active),
    () => create(),
  );
}
async function load(id) {
  catalog = await api("state?catalog=1");
  $("lock").hidden = false;
  let previous = {};
  try {
    previous = JSON.parse(sessionStorage.getItem("cg-selection")) || {};
  } catch {}
  const m = catalog.monitors.find((item) => item.id === (id || previous.id));
  const p =
    catalog.platforms.find((x) => (m ? x.channels.includes(m.channel) : x.id === previous.platform)) ||
    catalog.platforms.find((x) => x.channels.includes(catalog.monitors[0]?.channel)) ||
    catalog.platforms[0];
  const c = m?.channel || (p.channels.includes(previous.channel) ? previous.channel : p.channels[0]);
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
window.addEventListener("hashchange", () => refreshView().catch((e) => status(e.message)));
showView();
bindWebsiteReview({
  refresh: load,
  settled: (id) => {
    if (showView() !== "website" && active === id) return load(id);
  },
  open: async (id) => {
    await load(id);
    location.hash = "monitoring";
    showView();
  },
});
load().catch((error) => status(error.message));
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
