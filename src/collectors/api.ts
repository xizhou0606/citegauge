import { APICallError } from "ai";
import type { Channel, Monitor } from "../domain/monitor.ts";
import { createCollector, type ModelCredentials } from "./ai/factory.ts";

export function ready(env: ModelCredentials, channel: Channel, model?: string) {
  return Boolean(createCollector(env, channel, model));
}

export async function collect(env: ModelCredentials, monitor: Monitor) {
  const run = createCollector(env, monitor.channel, monitor.model);
  if (!run) throw Error("请先配置该渠道密钥和模型");
  try {
    return await run(monitor.question);
  } catch (error) {
    if (APICallError.isInstance(error)) {
      if (error.statusCode && error.statusCode >= 400)
        throw Error("采集服务 HTTP " + error.statusCode);
      throw Error("采集服务未返回有效响应");
    }
    throw error;
  }
}
