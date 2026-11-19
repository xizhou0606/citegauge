import { browserDefaults, defineConfig } from "./browser-config.ts";
import type { BrowserOptions, Metric, Emit } from "./browser-config.ts";
import { dimensions, pageLabel, visitorId, onNavigation, sessionStart } from "./browser-page.ts";
import { interactions } from "./browser-interactions.ts";
export { defineConfig, browserDefaults };
export type { BrowserOptions, BrowserFeatures } from "./browser-config.ts";

let active: AbortController | undefined;
let custom: ((name:string)=>void) | undefined;

export function close() { active?.abort();active=undefined;custom=undefined; }
export function track(name:string) { custom?.(name); }

export function init(config: BrowserOptions = {}) {
  if (config.enabled===false) { close();return; }
  if (active || typeof window==="undefined" || location.protocol!=="https:") return;
  const workspace=config.workspace ?? "";
  if (workspace && !/^[a-z][a-z0-9]{0,23}$/.test(workspace)) return;
  const flags={...browserDefaults,...config.collect};
  if (!Object.keys(browserDefaults).some(k=>flags[k as keyof typeof flags])) return;
  active=new AbortController();
  const signal=active.signal;
  const endpoint="https://citegauge.liushurui0606.workers.dev/collect/browser/v2"+
    (workspace ? "?workspace="+workspace : "");
  const startSession=flags.sessions ? sessionStart(workspace) : undefined;
  let visitor: string | undefined;
  function send(metrics: Metric[],pv=false) {
    if (signal.aborted || (!metrics.length && !pv)) return;
    const id=crypto.randomUUID().replaceAll("-","");
    if (pv) visitor ??= visitorId(workspace);
    const body=JSON.stringify({id,visitor:pv ? visitor : undefined,metrics});
    void fetch(endpoint,{method:"POST",body,credentials:"omit",referrerPolicy:"no-referrer",keepalive:true,
      redirect:"error"}).catch(()=>{});
  }
  let currentGroup="全部页面";
  const emit: Emit=(kind,label,value=1)=>send([{kind,label:kind==="engagement" ? currentGroup : label,value}]);
  let path: string | undefined;
  let nextPage: (()=>void) | undefined;
  function view() {
    if ((document as Document & {prerendering?:boolean}).prerendering || path===location.pathname) return;
    const first=nextPage===undefined;
    if (!nextPage) nextPage=interactions(flags,emit,signal);
    else nextPage();
    path=location.pathname;
    if (flags.pages) currentGroup=pageLabel(config.routes);
    const metrics: Metric[]=[];
    dimensions(flags,config,first,(kind,label,value=1)=>metrics.push({kind,label,value}));
    if (startSession?.()) metrics.push({kind:"session",label:"标签页会话",value:1});
    send(metrics,flags.pageviews);
  }
  if (flags.customEvents) custom=name=>{
    if (path!==undefined && config.events?.includes(name) && name.length<=100 && name.trim()) emit("custom",name);
  };
  view();
  onNavigation(view,signal);
  document.addEventListener("prerenderingchange",view,{signal,once:true});
  window.addEventListener("pageshow",event=>{
    if(event.persisted) {path=undefined;view();}
  },{signal});
}
export default {init,track,close};
