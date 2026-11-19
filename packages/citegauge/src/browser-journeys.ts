import type { BrowserFeatures, BrowserOptions, Emit } from "./browser-config.ts";
import { matchRoute, pageLabel } from "./browser-page.ts";

const idle = 30 * 60_000;
const publicName = (value:string) => !!value.trim() && value.length <= 48;
type Progress = { at:number; previous?:string; steps:Record<string,number> };

export function journeys(cfg:BrowserOptions, flags:BrowserFeatures, emit:Emit) {
  const key = "citegauge.journey." + (cfg.workspace ?? "");
  const funnels = flags.funnels ? (cfg.funnels ?? []).filter(f=>publicName(f.name) &&
    f.steps.length >= 2 && f.steps.length <= 12 && f.steps.every(s=>s.startsWith("/") && s.length<=100)) : [];
  const goals = flags.goals ? (cfg.goals ?? []).filter(g=>"route" in g && publicName(g.name)) : [];
  let state:Progress = {at:0,steps:{}};
  if (flags.journeys || funnels.length) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) ?? "null");
      if (saved && typeof saved.at==="number" && typeof saved.steps==="object" && saved.steps) state=saved;
    } catch { /* Use in-memory session when browser storage is unavailable. */ }
  }
  return () => {
    for (const goal of goals) {
      if ("route" in goal && matchRoute([goal.route])===goal.route) emit("goal",goal.name);
    }
    if (!flags.journeys && !funnels.length) return;
    const now=Date.now();
    if (now-state.at >= idle || now < state.at) state={at:now,steps:{}};
    state.at=now;
    if (flags.journeys) {
      const page=pageLabel(cfg.routes);
      if (state.previous===undefined) emit("entry",page);
      else emit("transition",state.previous+" → "+page);
      state.previous=page;
    } else delete state.previous;
    const progress: Record<string,number>={};
    for (const funnel of funnels) {
      const id=JSON.stringify([funnel.name,...funnel.steps]);
      let step=state.steps[id] ?? 0;
      if (step<funnel.steps.length && matchRoute([funnel.steps[step]])===funnel.steps[step]) {
        step++;
        emit("funnel",funnel.name+" · "+String(step).padStart(2,"0")+" · "+funnel.steps[step-1]);
      }
      progress[id]=step;
    }
    state.steps=progress;
    try { sessionStorage.setItem(key,JSON.stringify(state)); } catch { /* Keep tracking this document. */ }
  };
}
