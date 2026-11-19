import "./core/validation.js";
import { bindWebsiteReview, openWebsiteEntry } from "./components/site-review.js";
import { $, action, status } from "./core/ui.js";
import { api, requestJSON } from "./core/api.js";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { readEvidenceRoute } from "./core/evidence-route.js";
import { customerQuestionVersion } from "../../src/domain/brand-question-intents.ts";
import { Scope } from "./components/scope.jsx";
import { renderDashboard } from "./components/dashboard.jsx";

import { WebsitePicker, websiteOptions } from "./components/website-picker.jsx";

const website = createRoot($("website-scope"));
const scope = createRoot($("scope"));
let catalog, platform, channel, active, domain, sites = [], generation = 0;
function showView() {
  const links = [...document.querySelectorAll(".feature-nav a")];
  const hash = location.hash.split("?")[0];
  const parent = hash === "#evidence" ? "#sources" : hash === "#crawlers" ? "#traffic" : hash;
  const current = links.find(link => link.hash === parent) || links[0];
  const view = hash === "#evidence" ? "evidence" : current.hash.slice(1);
  const monitoring = view !== "website";
  $("website-panel").hidden = monitoring;
  $("app").hidden = !monitoring || !catalog;
  $("tools").hidden = !catalog;
  $("crumb").textContent = current.textContent;
  for (const link of links) {
    if (link === current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  return view;
}
function create(domain) {
  location.hash = "website";
  showView();
  openWebsiteEntry(domain);
}
async function select(p, c, id) {
  platform = p;
  channel = c;
  const matches = siteMonitors().filter((m) => m.channel === channel);
  const monitor = matches.find((m) => m.id === id) || matches[0];
  active = monitor?.id;
  const route = readEvidenceRoute(location.hash);
  if (route && route.monitor !== active) history.replaceState(null, "", "#evidence");
  sessionStorage.setItem("cg-selection", JSON.stringify({ domain, platform: p.id, channel, id: active }));
  await refreshView();
}
function siteMonitors() {
  return catalog.monitors.filter(m => m.domain === domain);
}
async function chooseSite(value, id, saved = {}) {
  generation++;
  domain = value;
  const monitors = siteMonitors();
  const m = monitors.find(m => m.id === id) ||
    monitors.find(m => m.channel === saved.channel && !m.brandPrompt) ||
    monitors.find(m => !m.brandPrompt) || monitors[0];
  const next = catalog.platforms.find(p => p.id === saved.platform && !id) ||
    catalog.platforms.find(p => p.channels.includes(m?.channel)) || catalog.platforms[0];
  const c = next.channels.includes(saved.channel) && !id ? saved.channel :
    next.channels.includes(m?.channel) ? m.channel : next.channels[0];
  return select(next,c,m?.id);
}
async function refreshView() {
  const view = showView();
  if (!catalog || !platform) return;
  website.render(createElement(WebsitePicker,{sites,domain,change: value =>
    chooseSite(value).catch(e => status(e.message))}));
  websiteReview.scope(domain, view === "website");
  const monitors = siteMonitors();
  const questionsAt = view === "sources" && channel === "通义千问 API" && sites.find(s => s.domain === domain)?.questionsAt;
  const choices = questionsAt ? monitors.filter(m => m.brandPrompt?.version === customerQuestionVersion && m.brandPrompt.at === questionsAt) : monitors;
  const selected = choices.find(m => m.id === active) || (questionsAt ? choices[0] : undefined);
  const siteView = view === "traffic" || (view === "competitors" && !location.hash.includes("section=mentions"));
  const monitor = selected || (siteView ? monitors[0] : undefined);
  scope.render(
    createElement(Scope, {
      view,
      title: $("crumb").textContent,
      platform,
      platforms: catalog.platforms,
      onPlatform: (platformId) => {
        const next = catalog.platforms.find((p) => p.id === platformId);
        const first = monitors.find((m) => next.channels.includes(m.channel));
        select(next, first?.channel || next.channels[0], first?.id).catch((e) => status(e.message));
      },
      channel,
      active:selected?.id,
      monitors:choices,
      onChannel: (c) => select(platform, c).catch((e) => status(e.message)),
      onMonitor: (id) => select(platform, channel, id).catch((e) => status(e.message)),
    }),
  );
  await renderDashboard(
    view,
    monitor,
    catalog.ready[channel],
    () => load(active),
    create,
    domain,
    questionsAt,
  );
}
async function load(id, requestedDomain) {
  const token = ++generation;
  const updated = await api("state?catalog=1");
  if (token !== generation) return;
  catalog = updated;
  sites = websiteOptions(catalog);
  $("lock").hidden = false;
  let previous = {};
  try {
    previous = JSON.parse(sessionStorage.getItem("cg-selection")) || {};
  } catch {}
  const targetId = id || readEvidenceRoute(location.hash)?.monitor || previous.id;
  const m = catalog.monitors.find(item => item.id === targetId);
  const selectedDomain = requestedDomain || m?.domain || (sites.some(s => s.domain === previous.domain) ? previous.domain : sites[0]?.domain);
  await chooseSite(selectedDomain,targetId,previous);

}
$("lock").onclick = action(async () => {
  await requestJSON("/api/auth/sign-out", {});
  location.replace("/login");
});
window.addEventListener("session-expired", () => {
  location.replace("/login");
});
$("add").onclick = () => create();
window.addEventListener("hashchange", () => {
  const route = readEvidenceRoute(location.hash);
  const next = route && catalog?.monitors.find(m => m.id === route.monitor);
  const work = next && active !== next.id ? chooseSite(next.domain,next.id) : refreshView();
  const destination = location.hash;
  work.then(() => requestAnimationFrame(() => {
    if (location.hash !== destination || (destination === "#website" && document.activeElement === $("website-url"))) return;
    const heading = document.querySelector(location.hash === "#website" ? "#website-entry:not([hidden]) h1, #website-result .reader-heading h1" : "#scope h1");
    heading?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  })).catch(e => status(e.message));
});
showView();
const websiteReview = bindWebsiteReview({
  refresh: load,
  settled: (id) => {
    if (showView() !== "website" && active === id) return load(id);
  },
  open: async (id, view = "monitoring") => {
    await load(id);
    location.hash = view;
    showView();
  },
});
load().then(() => websiteReview.start()).catch((error) => status(error.message));
window.addEventListener("site-questions-ready", e => {
  if (domain === e.detail) load(active,domain).catch(error => status(error.message));
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted) location.reload();
});
