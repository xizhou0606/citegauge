export type Vendor =
  | "ARK"
  | "DEEPSEEK"
  | "DASHSCOPE"
  | "MOONSHOT"
  | "OPENAI"
  | "ANTHROPIC"
  | "GOOGLE_GENERATIVE_AI"
  | "PERPLEXITY";
export type ModelCredentials = Partial<
  Record<`${Vendor}_API_KEY` | `${Vendor}_MODEL`, string>
>;

export interface Env extends ModelCredentials {
  [binding: `TENANT_${string}`]: D1Database | undefined;
  tenant?: string;
  BRAVE_SEARCH_API_KEY?: string;
  SLACK_BOT_TOKEN?: string;
  SLACK_SIGNING_SECRET?: string;
  SLACK_CHANNEL_ID?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  WORKSPACE: DurableObjectNamespace;
  ASSETS: Fetcher;
  BROWSER: BrowserRun;
  BROWSER_VISIT_LIMIT: RateLimit;
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}
