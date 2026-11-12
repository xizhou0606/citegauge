import { adapters } from "./providers.ts";
import {
  channels,
  type Channel,
  type ApiChannel,
} from "../../domain/platforms.ts";
import type { ModelCredentials } from "../../runtime/env.ts";
export type { ModelCredentials } from "../../runtime/env.ts";

function isApi(channel: Channel): channel is ApiChannel {
  return Object.hasOwn(adapters, channel);
}

function modelChoices(env: ModelCredentials, channel: ApiChannel) {
  const { vendor, defaults } = adapters[channel];
  const configured = env[`${vendor}_MODEL`]?.trim();
  return [...new Set(configured ? [configured, ...defaults] : defaults)];
}

export function modelCatalog(env: ModelCredentials) {
  return new Map(
    channels
      .filter(isApi)
      .map((channel) => [channel, modelChoices(env, channel)] as const),
  );
}

export function createCollector(
  env: ModelCredentials,
  channel: Channel,
  selected?: string,
) {
  if (!isApi(channel)) return;
  const adapter = adapters[channel];
  const model = selected || modelChoices(env, channel)[0];
  const key = env[`${adapter.vendor}_API_KEY`];
  if (key && model)
    return (question: string) => adapter.collect(key, model, question);
}
