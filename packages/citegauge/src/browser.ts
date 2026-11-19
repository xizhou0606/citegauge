export interface BrowserOptions {
  /** Omit for the self-managed workspace. Customer workspaces use their public workspace ID. */
  workspace?: string;
}

let started = false;
const randomId = () => crypto.randomUUID().replaceAll("-", "");

function visitorId(workspace: string) {
  const key = "citegauge.visitor." + workspace;
  const fresh = randomId();
  try {
    const saved = localStorage.getItem(key);
    if (saved && /^[0-9a-f]{32}$/.test(saved)) return saved;
    localStorage.setItem(key, fresh);
  } catch { /* Storage may be disabled. Use a visitor ID for this page lifetime. */ }
  return fresh;
}

export function init({workspace = ""}: BrowserOptions = {}) {
  if (started || typeof window === "undefined" || location.protocol !== "https:") return;
  if (workspace && !/^[a-z][a-z0-9]{0,23}$/.test(workspace)) return;
  const visitor = visitorId(workspace);
  const endpoint = "https://citegauge.liushurui0606.workers.dev/collect/browser/v1" +
    (workspace ? "?workspace=" + workspace : "");
  let lastPath: string | undefined;
  function pageview() {
    if ((document as Document & {prerendering?: boolean}).prerendering || location.pathname === lastPath) return;
    lastPath = location.pathname;
    void fetch(endpoint, {method:"POST", body:randomId() + "." + visitor, credentials:"omit",
      referrerPolicy:"no-referrer", keepalive:true, redirect:"error"}).catch(() => {});
  }
  started = true;
  pageview();
  document.addEventListener("prerenderingchange", pageview, {once:true});
  window.addEventListener("pageshow", event => {
    if (event.persisted) { lastPath = undefined; pageview(); }
  });
  const navigation = (window as Window & {navigation?: EventTarget}).navigation;
  if (navigation) navigation.addEventListener("currententrychange", pageview);
  else {
    window.addEventListener("popstate", pageview);
    for (const name of ["pushState", "replaceState"] as const) {
      const original = history[name];
      history[name] = function(...args) {
        original.apply(this,args);
        pageview();
      };
    }
  }
}

export default {init};
