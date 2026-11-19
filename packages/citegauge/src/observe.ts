import onHeaders from "on-headers";
import { isbot } from "isbot";
import { randomBytes, createHmac } from "node:crypto";
import { channel } from "node:diagnostics_channel";
import type { IncomingMessage, ServerResponse } from "node:http";
import { identifyCrawler } from "./bots.ts";
import type { CiteGaugeConfig, Visit } from "./types.ts";

export function observe(config: CiteGaugeConfig, token: string, emit: (event: Visit) => void) {
  const snapshots = new WeakMap<IncomingMessage,{path:string;contentType:string}>();
  const starts = channel("http.server.request.start");
  function start(message: unknown) {
    const {request,response} = message as {request: IncomingMessage; response: ServerResponse};
    const host = (request.headers.host || "").split(":")[0].toLowerCase().replace(/^www\./,"");
    if (host !== config.domain) return;
    const snapshot = {path:(request.url || "/").split(/[?#]/,1)[0],contentType:""};
    snapshots.set(request,snapshot);
    onHeaders(response,() => {snapshot.contentType = String(response.getHeader("content-type") ?? "");});
  }
  const finishes = channel("http.server.response.finish");
  function finish(message: unknown) {
    // Diagnostic callbacks run in the host request lifecycle. Never propagate telemetry errors.
    try {
      const {request, response} = message as {request: IncomingMessage; response: ServerResponse};
      const host = (request.headers.host || "").split(":")[0].toLowerCase();
      if (host.replace(/^www\./,"") !== config.domain) return;
      const snapshot = snapshots.get(request);
      if (!snapshot) return;
      const {path,contentType} = snapshot;
      if (!path.startsWith("/") || path.length > 2048) return;
      const agent = (request.headers["user-agent"] || "").slice(0,1024);
      const file = /\.(xml(?:\.gz)?|txt)$/i.test(path);
      const bot = identifyCrawler(agent);
      const status = response.statusCode;
      const headers = request.headers;
      const isPage = !file && !bot && request.method === "GET" && status >= 200 && status < 300
        && /^text\/html\b/i.test(contentType)
        && (!headers["sec-fetch-dest"] || headers["sec-fetch-dest"] === "document")
        && !/prefetch|prerender/i.test(String(headers["sec-purpose"] || headers.purpose || ""))
        && !isbot(agent);
      if (!isPage && !file && !bot) return;
      const identity = isPage && (config.visitorId?.(request) || [request.socket.remoteAddress,agent].join("\n"));
      const visitor = identity ? createHmac("sha256",token).update(identity).digest("hex") : null;
      const ray = headers["cf-ray"];
      const rayId = typeof ray === "string" && /^([\da-f]{16})(?:-[A-Z]+)?$/i.exec(ray);
      emit({id:rayId ? rayId[1].toLowerCase() : randomBytes(8).toString("hex"),
        host,path,status,at:Date.now(),agent: isPage ? "" : agent,visitor});
    } catch {
      // The site's handler may already have disposed of the request.
    }
  }
  starts.subscribe(start);
  finishes.subscribe(finish);
  return () => { starts.unsubscribe(start); finishes.unsubscribe(finish); };
}
