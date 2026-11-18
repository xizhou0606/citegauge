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
  WORKSPACE: DurableObjectNamespace;
  ASSETS: Fetcher;
  BROWSER: BrowserRun;
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
}
