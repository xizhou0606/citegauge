import { createAlibaba } from "@ai-sdk/alibaba";
import { generateText } from "ai";
import { qwenSearchModel } from "./qwen.ts";
import { liveSearch } from "./qwen-live-search.ts";
import { z } from "zod";
import { httpURL } from "../../domain/url.ts";
import { rawEvidence, samplingSettings } from "./settings.ts";

const endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation";
const results = z.array(z.object({index: z.number().int(), url: z.string()}));

export function markedSources(answer: string, candidates: unknown) {
  const list = results.safeParse(candidates);
  if (!list.success) return null;
  const refs = [...answer.matchAll(/\[ref_(\d+)\]/gi)];
  const rest = answer.replace(/\[ref_\d+\]/gi, "");
  if (!refs.length && /https?:\/\//i.test(rest)) return null;
  if (/\[ref_|\[\d+\]/i.test(rest)) return null;
  const urls = new Set<string>();
  for (const match of refs) {
    const mapped = list.data.filter(row => row.index === Number(match[1]));
    if (mapped.length !== 1) return null;
    try { urls.add(httpURL(mapped[0].url).href); } catch { return null; }
  }
  return [...urls];
}

export async function collectBrandQuestion(key: string, model: string, question: string) {
  if (model === qwenSearchModel) {
    const {answer,results,raw,searchedAt} = await liveSearch(key,question,"在用到来源的陈述后注明对应的 [ref_编号]。");
    return {answer,urls:markedSources(answer,results),page:"",model,raw,searchedAt};
  }
  let raw = "", sources: unknown;
  // The native DashScope protocol exposes the mapping from inline refs to search results.
  const provider = createAlibaba({apiKey: key, fetch: async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const response = await fetch(endpoint, {method: "POST", headers: init?.headers, signal: init?.signal,
      body: JSON.stringify({model, input: {messages: [{role:"user",content:question}]}, parameters: {
        result_format: "message", max_tokens: request.max_tokens, enable_thinking: false, enable_search: true,
        search_options: {forced_search: true, enable_source: true, enable_citation: true, citation_format: "[ref_<number>]"},
      }})});
    if (!response.ok) return response;
    const native = await response.json<{
      request_id: string; output: {choices: {message:unknown;finish_reason:string}[]; search_info?: {search_results: unknown}}; usage?: {input_tokens: number; output_tokens: number};
    }>();
    raw = rawEvidence(native);
    sources = native.output.search_info?.search_results;
    const usage = native.usage;
    return Response.json({id: native.request_id, model, choices: native.output.choices.map((c,index) => ({...c,index})),
      usage: usage && {prompt_tokens: usage.input_tokens, completion_tokens: usage.output_tokens,
        total_tokens: usage.input_tokens + usage.output_tokens}});
  }});
  const result = await generateText({...samplingSettings, model: provider.chatModel(model), prompt: question});
  if (result.finishReason !== "stop" || !result.text.trim() || !raw) throw Error("未取得完整的联网回答");
  return {answer: result.text, urls: markedSources(result.text, sources), page: "", model, raw};
}
