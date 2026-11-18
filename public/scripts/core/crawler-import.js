import { api } from "./api.js";

// Keep each JSON request below the authenticated API's byte limit, including escaping.
const batchBytes = 220000;
const encoder = new TextEncoder();

async function* fileLines(file) {
  const reader = file.stream().pipeThrough(new TextDecoderStream()).getReader();
  let tail = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      const parts = (tail + value).split("\n");
      tail = parts.pop();
      for (const line of parts) yield line;
      if (tail.length > batchBytes) throw Error("单条日志过大");
    }
    if (tail) yield tail;
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}

export async function importCrawlerFile(monitor, file, progress) {
  const totals = { added: 0, skipped: 0, duplicates: 0 };
  let lines = [], bytes = 0, completed = 0;
  async function flush() {
    const result = await api("crawler-logs", { monitor, log: lines.join("\n") });
    for (const field of Object.keys(totals)) totals[field] += result[field];
    completed += lines.length;
    progress(`已处理 ${completed} 条日志…`);
    lines = [];
    bytes = 0;
  }
  try {
    for await (const line of fileLines(file)) {
      if (!line.trim()) continue;
      const size = encoder.encode(JSON.stringify(line)).length + 2;
      if (size > batchBytes) throw Error("单条日志过大");
      if (bytes + size > batchBytes) await flush();
      lines.push(line);
      bytes += size;
    }
    if (lines.length) await flush();
    if (!completed) throw Error("请选择包含访问记录的 JSONL 文件");
  } catch (e) {
    throw Error(`已处理 ${completed} 条。当前批次：${e.message}。可重新导入同一文件。`);
  }
  return totals;
}
