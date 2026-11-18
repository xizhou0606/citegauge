import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import type { Env } from "../runtime/env.ts";

export type Platform = "slack" | "telegram";

export function destinations(env: Env) {
  return [
    { id: "slack", label: "Slack", address: env.SLACK_CHANNEL_ID || "",
      ready: !!(env.SLACK_BOT_TOKEN && env.SLACK_SIGNING_SECRET && /^[CG][A-Z0-9]+$/.test(env.SLACK_CHANNEL_ID || "")) },
    { id: "telegram", label: "Telegram", address: env.TELEGRAM_CHAT_ID || "",
      ready: !!(env.TELEGRAM_BOT_TOKEN && /^-?\d+$/.test(env.TELEGRAM_CHAT_ID || "")) },
  ];
}

export async function postReport(env: Env, platform: Platform, address: string, markdown: string) {
  const adapter = platform === "slack"
    ? createSlackAdapter({ botToken: env.SLACK_BOT_TOKEN, signingSecret: env.SLACK_SIGNING_SECRET,
      webClientOptions: { timeout: 15000, retryConfig: { retries: 0 }, rejectRateLimitedCalls: true } })
    : createTelegramAdapter({ mode: "webhook", botToken: env.TELEGRAM_BOT_TOKEN,
      secretToken: crypto.randomUUID(), persistThreadHistory: false });
  const chat = new Chat({ userName: "CiteGauge", adapters: { [platform]: adapter },
    state: createMemoryState(), logger: "silent" });
  try {
    await chat.initialize();
    await chat.channel(platform + ":" + address).post({ markdown });
  } finally {
    await chat.shutdown();
  }
}
