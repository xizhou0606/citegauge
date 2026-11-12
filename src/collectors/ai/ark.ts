import { createOpenAI } from "@ai-sdk/openai";
import { APICallError, generateText, TypeValidationError } from "ai";
import { arkEvidence } from "./ark-evidence.ts";
import { samplingSettings } from "./settings.ts";

export async function collectArk(
  apiKey: string,
  model: string,
  question: string,
) {
  const ark = createOpenAI({
    apiKey,
    baseURL: "https://ark.cn-beijing.volces.com/api/v3",
  });
  let body: unknown;
  try {
    const result = await generateText({
      ...samplingSettings,
      model: ark.responses(model),
      prompt: question,
      tools: { web_search: ark.tools.webSearch({}) },
      providerOptions: { openai: { includeWebSearchSources: false } },
    });
    body = result.response.body;
  } catch (error) {
    // Ark can return web_search_result or omit annotations. Use the body of
    // this successful call when it differs from the OpenAI provider schema.
    if (
      !APICallError.isInstance(error) ||
      error.statusCode !== 200 ||
      !TypeValidationError.isInstance(error.cause)
    )
      throw error;
    body = error.cause.value;
  }
  return arkEvidence(body, model);
}
