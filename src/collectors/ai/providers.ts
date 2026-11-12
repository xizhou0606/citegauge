import { createAlibaba } from "@ai-sdk/alibaba";
import { createMoonshotAI } from "@ai-sdk/moonshotai";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createPerplexity } from "@ai-sdk/perplexity";
import { collectArk } from "./ark.ts";
import { collectDeepSeek } from "./deepseek.ts";
import { textSample } from "./text-sample.ts";
import type { ApiChannel } from "../../domain/platforms.ts";
import type { Evidence } from "../../domain/monitor.ts";
import type { Vendor } from "../../runtime/env.ts";

interface Adapter {
  vendor: Vendor;
  defaults: string[];
  collect(key: string, model: string, question: string): Promise<Evidence>;
}

export const adapters: Record<ApiChannel, Adapter> = {
  "火山方舟 API": { vendor: "ARK", defaults: [], collect: collectArk },
  "DeepSeek API": {
    vendor: "DEEPSEEK",
    defaults: ["deepseek-flash", "deepseek-v4-pro"],
    collect: collectDeepSeek,
  },
  "通义千问 API": {
    vendor: "DASHSCOPE",
    defaults: ["qwen-plus", "qwen-flash"],
    collect(key, model, question) {
      const provider = createAlibaba({
        apiKey: key,
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      });
      return textSample(provider.chatModel(model), question);
    },
  },
  "Kimi API": {
    vendor: "MOONSHOT",
    defaults: ["kimi-k2.6", "kimi-k2.5"],
    collect(key, model, question) {
      const provider = createMoonshotAI({
        apiKey: key,
        baseURL: "https://api.moonshot.cn/v1",
      });
      return textSample(provider.chatModel(model), question);
    },
  },
  "OpenAI API": {
    vendor: "OPENAI",
    defaults: ["gpt-5-mini", "gpt-5.4"],
    collect(key, model, question) {
      const provider = createOpenAI({ apiKey: key });
      return textSample(provider.responses(model), question, {
        tools: { web_search: provider.tools.webSearch({}) },
      });
    },
  },
  "Claude API": {
    vendor: "ANTHROPIC",
    defaults: ["claude-sonnet-4-6", "claude-sonnet-5-5"],
    collect(key, model, question) {
      const provider = createAnthropic({ apiKey: key });
      return textSample(provider(model), question, {
        tools: {
          web_search: provider.tools.webSearch_20250305({ maxUses: 1 }),
        },
      });
    },
  },
  "Gemini API": {
    vendor: "GOOGLE_GENERATIVE_AI",
    defaults: ["gemini-3.5-flash", "gemini-3.8-flash"],
    collect(key, model, question) {
      const provider = createGoogle({ apiKey: key });
      return textSample(
        provider.chat(model),
        question,
        { tools: { google_search: provider.tools.googleSearch({}) } },
        "google",
      );
    },
  },
  "Perplexity API": {
    vendor: "PERPLEXITY",
    defaults: ["perplexity/sonar"],
    collect(key, model, question) {
      const provider = createPerplexity({ apiKey: key });
      return textSample(
        provider(model),
        question,
        {
          providerOptions: { perplexity: { tools: [{ type: "web_search" }] } },
        },
        "perplexity",
      );
    },
  },
};
