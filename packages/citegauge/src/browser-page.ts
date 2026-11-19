import type { BrowserFeatures, BrowserOptions, Emit } from "./browser-config.ts";

export function matchRoute(templates: readonly string[] = []) {
  if (location.pathname === "/") return "/";
  const parts = location.pathname.split("/").filter(Boolean);
  return templates.find(template=>{
    if (!template.startsWith("/") || template.length>100) return false;
    const pattern=template.split("/").filter(Boolean);
    return pattern.length===parts.length && pattern.every((part,i)=>part.startsWith(":") || part===parts[i]);
  });
}

export function pageLabel(templates?: readonly string[]) {
  return matchRoute(templates) ?? "其他页面";
}

export function visitorId(workspace: string) {
  const key = "citegauge.visitor."+workspace;
  const fresh = crypto.randomUUID().replaceAll("-","");
  try {
    const saved = localStorage.getItem(key);
    if (saved && /^[0-9a-f]{32}$/.test(saved)) return saved;
    localStorage.setItem(key,fresh);
  } catch { /* Private storage may be unavailable. */ }
  return fresh;
}

export function sessionStart(workspace: string) {
  let previous = 0;
  return () => {
    const key = "citegauge.activity."+workspace;
    const now = Date.now();
    try {
      previous = Number(sessionStorage.getItem(key)) || previous;
      sessionStorage.setItem(key,String(now));
    } catch { /* Fall back to this document. */ }
    const fresh = now-previous >= 30*60000;
    previous = now;
    return fresh;
  };
}

export function dimensions(flags: BrowserFeatures, cfg: BrowserOptions, first: boolean, emit: Emit) {
  if (flags.pages) emit("page",pageLabel(cfg.routes));
  if (flags.devices) emit("device","auto");
  if (flags.countries) emit("country","auto");
  if (flags.environment) {
    emit("screen",innerWidth<768 ? "<768 px" : innerWidth<1280 ? "768–1279 px" : "≥1280 px");
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? "Edge" : /Firefox|FxiOS/.test(ua) ? "Firefox" :
      /Chrome|CriOS/.test(ua) ? "Chrome" : /Safari/.test(ua) ? "Safari" : "其他";
    const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" :
      /Windows/.test(ua) ? "Windows" : /Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "其他";
    emit("browser",browser); emit("os",os);
    emit("language",navigator.language.split("-")[0].slice(0,12) || "未知");
  }
  if (first && flags.referrers) {
    let host = "";
    try { host=new URL(document.referrer).hostname; } catch { /* Direct or withheld. */ }
    const internal = host===location.hostname;
    emit("referrer",host ? internal ? "站内" : host.slice(0,100) : "直接或来源不可见");
    const ai = /(^|\.)(chatgpt\.com|perplexity\.ai|claude\.ai|gemini\.google\.com|doubao\.com|deepseek\.com|qwen\.ai)$/i;
    const search=/(^|\.)(bing\.com|baidu\.com|duckduckgo\.com|google\.(com|cn|co\.uk|co\.jp)|so\.com|sogou\.com)$/i;
    const social=/(^|\.)(weibo\.com|zhihu\.com|xiaohongshu\.com|linkedin\.com|reddit\.com|x\.com|t\.co|facebook\.com)$/i;
    const channel=!host ? "直接或来源不可见" : internal ? "站内" : ai.test(host) ? "AI 引荐" :
      search.test(host) ? "搜索引荐" : social.test(host) ? "社交引荐" : "其他外部引荐";
    emit("channel",channel);
  }
  if (first && flags.campaigns) {
    const params=new URLSearchParams(location.search);
    for (const key of ["utm_source","utm_medium","utm_campaign"] as const) {
      const value=params.get(key);
      if (value && /^[\p{L}\p{N} _.+-]{1,80}$/u.test(value)) emit(key,value);
    }
  }
  if (flags.siteSearch) {
    const params=new URLSearchParams(location.search);
    if ((cfg.searchKeys ?? ["q","query","search"]).some(key=>params.has(key))) emit("search","搜索结果浏览");
  }
}

export function onNavigation(fn: ()=>void, signal: AbortSignal) {
  const nav=(window as Window & {navigation?:EventTarget}).navigation;
  if (nav) nav.addEventListener("currententrychange",fn,{signal});
  else {
    window.addEventListener("popstate",fn,{signal});
    for (const name of ["pushState","replaceState"] as const) {
      const original=history[name];
      const wrapped: typeof original=function(this: History,...args) { original.apply(this,args); fn(); };
      history[name]=wrapped;
      signal.addEventListener("abort",()=>{if(history[name]===wrapped) history[name]=original;},{once:true});
    }
  }
}
