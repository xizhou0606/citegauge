import { createAlibaba } from "@ai-sdk/alibaba";

export const qwenModel = "qwen3.7-flash";
export const qwenOptions = { alibaba: { enableThinking: false } };

export function qwen(key: string) {
  return createAlibaba({
    apiKey: key, baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  });
}
