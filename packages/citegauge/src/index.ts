import { resolve } from "node:path";
import { createJiti } from "jiti";
import { observe } from "./observe.ts";
import { transport } from "./transport.ts";
import type { CiteGaugeConfig } from "./types.ts";
export type { CiteGaugeConfig } from "./types.ts";

export function defineConfig(config: CiteGaugeConfig) { return config; }

export interface CiteGaugeClient {
  flush(): Promise<void>;
  close(): Promise<void>;
}

let active: Promise<CiteGaugeClient> | undefined;

async function start(options?: CiteGaugeConfig): Promise<CiteGaugeClient> {
  const file = resolve(process.cwd(),"citegauge.ts");
  const config: CiteGaugeConfig = options ?? await createJiti(import.meta.url).import<CiteGaugeConfig>(file,{default:true});
  const domain = config?.domain?.toLowerCase().replace(/^www\./,"");
  const token = config?.token ?? process.env.CITEGAUGE_TOKEN;
  if (!domain || !/^[a-z\d.-]+\.[a-z\d-]+$/.test(domain) || !token) throw Error("请配置 citegauge.ts 的 domain 和 CITEGAUGE_TOKEN");
  const endpoint = new URL(config.endpoint || "https://citegauge.liushurui0606.workers.dev/collect/v1");
  if (endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && ["localhost","127.0.0.1","[::1]"].includes(endpoint.hostname)))
    throw Error("CiteGauge 采集地址需要 HTTPS");
  const sender = transport(endpoint.href,token);
  const detach = observe({...config,domain},token,sender.add);
  let closing: Promise<void> | undefined;
  const beforeExit = () => { void sender.close().catch(() => {}); };
  process.once("beforeExit",beforeExit);
  return {flush:sender.flush,close() {
    if (!closing) {
      detach();
      process.removeListener("beforeExit",beforeExit);
      closing = sender.close().finally(() => { active = undefined; });
    }
    return closing;
  }};
}

export function init(config?: CiteGaugeConfig) {
  return active ??= start(config).catch(error => { active = undefined; throw error; });
}
export default { init };
