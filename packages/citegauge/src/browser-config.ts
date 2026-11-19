export const browserDefaults = {
  pageviews:true, devices:true, pages:true, referrers:true, campaigns:true, sessions:true,
  countries:true, environment:true, engagement:true, scrollDepth:true, outboundLinks:true, downloads:true,
  forms:true, siteSearch:true, errors:true, customEvents:true, webVitals:true,
} as const;

export type BrowserFeatures = Record<keyof typeof browserDefaults, boolean>;
export interface BrowserOptions {
  enabled?: boolean;
  workspace?: string;
  collect?: Partial<BrowserFeatures>;
  /** Public route templates only. Dynamic segments use :name; unmatched routes share one bucket. */
  routes?: readonly string[];
  /** Business event names accepted by track(). No custom payload is collected. */
  events?: readonly string[];
  searchKeys?: readonly string[];
}
export function defineConfig(config: BrowserOptions) { return config; }

export const metricKinds = ["page","referrer","channel","utm_source","utm_medium","utm_campaign",
  "session","country","screen","device","browser","os","language","engagement","scroll","outbound","download","form",
  "search","error","custom","LCP","INP","CLS"] as const;
export type MetricKind = typeof metricKinds[number];
export type Metric = {kind:MetricKind;label:string;value:number};
export type Emit = (kind:MetricKind,label:string,value?:number)=>void;
