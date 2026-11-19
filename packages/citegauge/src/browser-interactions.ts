import type { BrowserFeatures, Emit } from "./browser-config.ts";

export function interactions(flags: BrowserFeatures, emit: Emit, signal: AbortSignal) {
  const options = {capture:true,signal};
  if (flags.outboundLinks || flags.downloads) document.addEventListener("click",e=>{
    const a=e.composedPath().find((n): n is HTMLAnchorElement=>n instanceof HTMLAnchorElement);
    if (!a?.href) return;
    const url=new URL(a.href);
    if (!["http:","https:"].includes(url.protocol)) return;
    if (flags.outboundLinks && url.hostname!==location.hostname) emit("outbound",url.hostname.slice(0,100));
    if (flags.downloads) {
      const ext=/\.(pdf|docx?|xlsx?|pptx?|csv|zip|gz|mp[34]|txt|json|dmg|exe|apk)$/i.exec(url.pathname)?.[1];
      if (ext || a.hasAttribute("download")) emit("download",ext?.toLowerCase() ?? "其他文件");
    }
  },options);
  if (flags.forms) document.addEventListener("submit",()=>emit("form","表单提交"),options);
  if (flags.errors) {
    window.addEventListener("error",e=>{if (e instanceof ErrorEvent) emit("error","脚本错误");},options);
    window.addEventListener("unhandledrejection",()=>emit("error","未处理的 Promise 拒绝"),options);
  }
  let mark=0;
  if (flags.scrollDepth) window.addEventListener("scroll",()=>{
    const el=document.scrollingElement;
    if (!el || el.scrollHeight<=innerHeight || el.scrollTop<=0) return;
    const pct=100*(el.scrollTop+innerHeight)/el.scrollHeight;
    for (const depth of [25,50,75,90]) {
      if (depth>mark && pct>=depth) {mark=depth;emit("scroll",depth+"%");}
    }
  },{passive:true,signal});
  let since: number | null=null;
  function flush() {
    if (since===null) return;
    const elapsed=Math.round(performance.now()-since);
    since=null;
    if (elapsed>0) emit("engagement","前台可见",elapsed);
  }
  function resume() { if(flags.engagement && !document.hidden && since===null) since=performance.now(); }
  if (flags.engagement) {
    document.addEventListener("visibilitychange",()=>document.hidden ? flush() : resume(),{signal});
    window.addEventListener("pagehide",flush,{signal});
    resume();
  }
  if (flags.webVitals) void import("web-vitals").then(({onLCP,onINP,onCLS})=>{
    if (signal.aborted) return;
    const report = (m:{name:"LCP"|"INP"|"CLS";value:number})=>{
      if (!signal.aborted) emit(m.name,"页面载入",m.value);
    };
    onLCP(report);onINP(report);onCLS(report);
  }).catch(()=>{});
  return ()=>{flush();resume();mark=0;};
}
