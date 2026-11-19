import type { BrowserFeatures, BrowserOptions, Emit } from "./browser-config.ts";

function matches(element:Element, selector:string) {
  try { return !!element.closest(selector); } catch { return false; }
}

export function autoCapture(cfg:BrowserOptions, flags:BrowserFeatures, emit:Emit, signal:AbortSignal) {
  const options={signal,capture:true};
  const names=flags.clicks ? Object.entries(cfg.controls ?? {}).filter(([name])=>name.trim() && name.length<=100) : [];
  const goals=flags.goals ? (cfg.goals ?? []).filter(g=>"selector" in g && g.name.trim() && g.name.length<=48) : [];
  if (flags.clicks || goals.length) document.addEventListener("click",e=>{
    const element=e.composedPath().find((node):node is Element=>node instanceof Element);
    if (!element) return;
    for (const goal of goals) {
      if ("selector" in goal && matches(element,goal.selector)) emit("goal",goal.name);
    }
    if (!flags.clicks) return;
    const named=names.find(([,selector])=>matches(element,selector));
    if (named) { emit("click",named[0]);return; }
    const control=element.closest('button,a[href],summary,[role="button"],[role="tab"],[role="menuitem"],input[type="submit"]');
    if (!control) return;
    const role=control.getAttribute("role");
    const kind=role==="tab" ? "标签" : role==="menuitem" ? "菜单项" :
      control.tagName==="A" ? "链接" : control.tagName==="SUMMARY" ? "折叠面板" : "按钮";
    emit("click",kind);
  },options);
  if (flags.formStarts) {
    let seen=new WeakSet<HTMLFormElement>();
    document.addEventListener("input",e=>{
      const form=e.target instanceof Element ? e.target.closest("form") : null;
      if (form && !seen.has(form)) {seen.add(form);emit("form_start","首次填写");}
    },options);
    document.addEventListener("submit",e=>{
      if (e.target instanceof HTMLFormElement) seen.delete(e.target);
    },options);
  }
  if (flags.media) for (const type of ["play","pause","ended"]) {
    document.addEventListener(type,e=>{
      if (e.target instanceof HTMLMediaElement) emit("media",(e.target.tagName==="VIDEO" ? "视频" : "音频")+
        ({play:"播放",pause:"暂停",ended:"结束"}[type] ?? ""));
    },options);
  }
  if (flags.resourceErrors) window.addEventListener("error",e=>{
    const tag=e.target instanceof Element ? e.target.tagName : "";
    if (["IMG","LINK","SCRIPT","VIDEO","AUDIO","SOURCE"].includes(tag)) emit("resource_error",tag);
  },options);
  if (flags.navigationTiming) {
    const nav=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav) emit("navigation",nav.type);
    void import("web-vitals").then(({onTTFB,onFCP})=>{
      if (signal.aborted) return;
      const report=(m:{name:"TTFB"|"FCP";value:number})=>{
        if (!signal.aborted) emit(m.name,"页面载入",m.value);
      };
      onTTFB(report);onFCP(report);
    }).catch(()=>{});
  }
}
