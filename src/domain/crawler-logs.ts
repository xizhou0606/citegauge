const crawlers = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Bytespider"];
const signature = new RegExp("(?:^|[\\s(;])(" + crawlers.join("|") + ")(?=/|[\\s;)]|$)", "i");

function parseVisit(line: string, domain: string) {
  const row = JSON.parse(line);
  const { ClientRequestHost: host, ClientRequestUserAgent: agent } = row;
  if (typeof host !== "string" || typeof agent !== "string") throw Error();
  if (host.toLowerCase().replace(/^www\./, "") !== domain) return null;
  const name = signature.exec(agent)?.[1];
  const bot = crawlers.find(value => value.toLowerCase() === name?.toLowerCase());
  if (!bot) return null;
  const { RayID: id, EdgeStartTimestamp: stamp, EdgeResponseStatus: status } = row;
  const path = row.ClientRequestPath ?? row.ClientRequestURI;
  const at = typeof stamp === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/i.test(stamp)
    ? Date.parse(stamp) : NaN;
  if (typeof id !== "string" || !/^[\da-f]{16}$/i.test(id) || !Number.isFinite(at) ||
      typeof path !== "string" || !path.startsWith("/") || path.length > 8192 ||
      !Number.isInteger(status) || status < 0 || status > 599 || agent.length > 4096) throw Error();
  return { id: id.toLowerCase(), at, bot, host: host.toLowerCase(), path: path.split(/[?#]/, 1)[0], status, agent };
}

export function parseCrawlerLogs(input: unknown, domain: string) {
  if (typeof input !== "string" || !input.trim()) throw Error("请选择包含访问记录的 JSONL 文件");
  const visits = [];
  let skipped = 0;
  const lines = input.split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      const visit = parseVisit(line, domain);
      if (visit) visits.push(visit);
      else skipped++;
    } catch {
      throw Error(`第 ${i + 1} 行的日志字段或格式无效，请检查文件后重试`);
    }
  }
  return { visits, skipped };
}
