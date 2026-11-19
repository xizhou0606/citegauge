import type { IncomingMessage } from "node:http";

export interface CiteGaugeConfig {
  domain: string;
  token?: string;
  endpoint?: string;
  /** Use an existing anonymous site identifier when available. Never return a login or email. */
  visitorId?: (request: IncomingMessage) => string | undefined;
}

export interface Visit {
  id: string;
  at: number;
  host: string;
  path: string;
  status: number;
  agent: string;
  visitor: string | null;
}
