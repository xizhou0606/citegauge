const crawlers = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Bytespider"];
const signature = new RegExp("(?:^|[\\s(;])(" + crawlers.join("|") + ")(?=/|[\\s;)]|$)", "i");

function parseVisit(line: string, domain: string, paths?: ReadonlySet<string>) {
  const row = JSON.parse(line);
  const { ClientRequestHost: host } = row;
  const agent = row.ClientRequestUserAgent ?? "";
  if (typeof host !== "string" || typeof agent !== "string") throw Error();
  if (host.toLowerCase().replace(/^www\./, "") !== domain) return null;
  const name = signature.exec(agent)?.[1];
  const bot = crawlers.find(value => value.toLowerCase() === name?.toLowerCase());

  const { RayID: id, EdgeStartTimestamp: stamp, EdgeResponseStatus: status } = row;
  const uri = row.ClientRequestPath ?? row.ClientRequestURI;
  if (typeof uri !== "string" || !uri.startsWith("/") || uri.length > 8192) throw Error();
  const path = uri.split(/[?#]/, 1)[0];
  const at = typeof stamp === "string" && /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/i.test(stamp)
    ? Date.parse(stamp) : NaN;
  if (typeof id !== "string" || !/^[\da-f]{16}$/i.test(id) || !Number.isFinite(at) ||
      !Number.isInteger(status) || status < 0 || status > 599 || agent.length > 4096) throw Error();
  if (!bot && !paths?.has(path) && !/\.(?:xml(?:\.gz)?|txt)$/i.test(path)) return { at, visit: null };
  return { at, visit: { id: id.toLowerCase(), at, bot: bot ?? "", host: host.toLowerCase(), path, status, agent } };
}

export function parseCrawlerLogs(input: unknown, domain: string, paths?: ReadonlySet<string>) {
  if (typeof input !== "string" || !input.trim()) throw Error("请选择包含访问记录的 JSONL 文件");
  const visits = [];
  const days = new Map<number, { day: number; first: number; last: number }>();
  let skipped = 0;
  const lines = input.split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    try {
      const event = parseVisit(line, domain, paths);
      if (event) {
        const day = Math.floor(event.at / 86400000);
        const coverage = days.get(day);
        days.set(day, { day, first: Math.min(coverage?.first ?? event.at, event.at),
          last: Math.max(coverage?.last ?? event.at, event.at) });
      }
      if (event?.visit) visits.push(event.visit);
      else skipped++;
    } catch {
      throw Error(`第 ${i + 1} 行的日志字段或格式无效，请检查文件后重试`);
    }
  }
  return { visits, skipped, days: [...days.values()] };
}
