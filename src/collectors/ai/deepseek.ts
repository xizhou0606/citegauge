import { createDeepSeek } from "@ai-sdk/deepseek";
import { textSample } from "./text-sample.ts";

export function collectDeepSeek(
  apiKey: string,
  model: string,
  question: string,
) {
  return textSample(createDeepSeek({ apiKey }).chat(model), question, {
    providerOptions: { deepseek: { thinking: { type: "disabled" } } },
  });
}
