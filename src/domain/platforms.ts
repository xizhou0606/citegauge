export const platforms = [
  { id: "doubao", name: "豆包", channels: ["豆包网页", "火山方舟 API"] },
  {
    id: "deepseek",
    name: "DeepSeek",
    channels: ["DeepSeek 网页", "DeepSeek API"],
  },
  { id: "qwen", name: "通义千问", channels: ["通义千问 API"] },
  { id: "kimi", name: "Kimi", channels: ["Kimi API"] },
  { id: "openai", name: "OpenAI", channels: ["OpenAI API"] },
  { id: "claude", name: "Claude", channels: ["Claude API"] },
  { id: "gemini", name: "Gemini", channels: ["Gemini API"] },
  { id: "perplexity", name: "Perplexity", channels: ["Perplexity API"] },
] as const;

export type Channel = (typeof platforms)[number]["channels"][number];
export type ApiChannel = Extract<Channel, `${string} API`>;
export const channels: readonly Channel[] = platforms.flatMap<Channel>(
  (p) => p.channels,
);
