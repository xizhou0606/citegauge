const bots = ["GPTBot", "OAI-SearchBot", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Bytespider"];
const signature = new RegExp("(?:^|[\\s(;])(" + bots.join("|") + ")(?=/|[\\s;)]|$)", "i");

export function identifyCrawler(agent: string) {
  const name = signature.exec(agent)?.[1];
  return bots.find(bot => bot.toLowerCase() === name?.toLowerCase()) ?? "";
}
