import { createAlibaba } from "@ai-sdk/alibaba";
import { generateText } from "ai";
import { createParser } from "eventsource-parser";
import { qwenSearchModel } from "./qwen.ts";
import { archiveStream, streamLimit } from "./search-archive.ts";
import { rawEvidence, samplingSettings } from "./settings.ts";

const endpoint = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

interface SearchFrame {
  code?: string;
  request_id?: string;
  output?: {
    choices?: {message?: {content?: {text?: string}[]}; finish_reason?: string}[];
    search_info?: {search_results?: {index: number; url: string; title?: string}[]};
  };
  usage?: {input_tokens: number; output_tokens: number};
}

async function readSearchStream(response: Response) {
  const chunks: Uint8Array[] = [];
  const decoder = new TextDecoder();
  const reader = response.body?.getReader();
  if (!reader) throw Error("联网检索未返回响应流");
  const sources = new Map<string,{index:number;url:string;title?:string}>();
  let answer = "", finish = "", id = "", usage: SearchFrame["usage"];
  const parser = createParser({onEvent({data}) {
    if (data === "[DONE]") return;
    const frame: SearchFrame = JSON.parse(data);
    if (frame.code) throw Error("联网检索失败：" + String(frame.code).slice(0,100));
    for (const row of frame.output?.search_info?.search_results || []) {
      if (Number.isInteger(row.index) && typeof row.url === "string")
        sources.set(JSON.stringify([row.index,row.url]),row);
    }
    for (const choice of frame.output?.choices || []) {
      answer += (choice.message?.content || []).map(part => part.text || "").join("");
      if (choice.finish_reason && choice.finish_reason !== "null") finish = choice.finish_reason;
    }
    id = frame.request_id || id;
    usage = frame.usage || usage;
  }});
  let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > streamLimit) throw Error("响应超过单次证据容量");
      chunks.push(value);
      parser.feed(decoder.decode(value,{stream:true}));
    }
    parser.feed(decoder.decode() + "\n\n");
  } finally {
    await reader.cancel();
  }
  if (!sources.size) throw Error("本次未取得联网搜索来源");
  if (finish !== "stop" || !answer.trim()) throw Error("未取得完整的联网回答");
  const results = [...sources.values()];
  const raw = rawEvidence({streamGzip:archiveStream(chunks),request_id:id,output:{search_info:{search_results:results}},usage});
  return {answer,id,usage,results,raw};
}

export async function liveSearch(key: string, question: string, instruction: string, maxTokens: number = samplingSettings.maxOutputTokens) {
  const searchedAt = new Date().toISOString();
  const system = "查询日期为 " + searchedAt.slice(0,10) + "（UTC）。优先查阅当前有效的官方产品页及最近更新的资料。"
      + "涉及价格、功能或排序时按检索证据作答，证据不足时说明哪些信息待核实。" + instruction;
  let evidence: Awaited<ReturnType<typeof readSearchStream>> | undefined;
  const provider = createAlibaba({apiKey:key, fetch:async (_url, init) => {
    const request = JSON.parse(String(init?.body));
    const headers = new Headers(init?.headers);
    headers.set("X-DashScope-SSE","enable");
    const response = await fetch(endpoint,{method:"POST",headers,signal:init?.signal,body:JSON.stringify({
      model:qwenSearchModel, input:{messages:[
        {role:"system",content:[{text:system}]},{role:"user",content:[{text:question}]}]},
      parameters:{incremental_output:true,max_tokens:request.max_tokens,enable_thinking:false,enable_search:true,
        search_options:{forced_search:true,enable_source:true,enable_citation:true,citation_format:"[ref_<number>]"}}})});
    if (!response.ok) return response;
    evidence = await readSearchStream(response);
    const {id,answer,usage} = evidence;
    return Response.json({id,model:qwenSearchModel,choices:[{index:0,finish_reason:"stop",message:{role:"assistant",content:answer}}],
      usage:usage && {prompt_tokens:usage.input_tokens,completion_tokens:usage.output_tokens,total_tokens:usage.input_tokens+usage.output_tokens}});
  }});
  const result = await generateText({...samplingSettings, maxOutputTokens:maxTokens, model:provider.chatModel(qwenSearchModel),
    system,prompt:question});
  if (!evidence || result.finishReason !== "stop") throw Error("未取得完整的联网回答");
  return {...evidence,searchedAt};
}
