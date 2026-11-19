import { browserDefaults, defineConfig } from "./browser-config.ts";
import type { BrowserOptions, Metric, Emit } from "./browser-config.ts";
import { dimensions, pageLabel, visitorId, onNavigation, sessionStart } from "./browser-page.ts";
import { interactions } from "./browser-interactions.ts";
import { autoCapture } from "./browser-autocapture.ts";
import { journeys } from "./browser-journeys.ts";
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
  let pending: Metric[] | undefined;
  const emit: Emit=(kind,label,value=1)=>{
    const metric={kind,label:kind==="engagement" ? currentGroup : label,value};
    if (pending) pending.push(metric);
    else send([metric]);
  };
  const visitJourney=journeys(config,flags,emit);
  let path: string | undefined;
  let nextPage: (()=>void) | undefined;
  function view() {
    if ((document as Document & {prerendering?:boolean}).prerendering || path===location.pathname) return;
    const first=nextPage===undefined;
    pending=[];
    if (!nextPage) {
      nextPage=interactions(flags,emit,signal);
      autoCapture(config,flags,emit,signal);
    }
    else nextPage();
    path=location.pathname;
    if (flags.pages) currentGroup=pageLabel(config.routes);
    dimensions(flags,config,first,emit);
    if (startSession?.()) emit("session","标签页会话");
    visitJourney();
    const metrics=pending;
    pending=undefined;
    send(metrics.splice(0,16),flags.pageviews);
    while (metrics.length) send(metrics.splice(0,16));
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
