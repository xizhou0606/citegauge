/// <reference types="node" />
import { Buffer } from "node:buffer";
import { gzipSync, gunzipSync } from "node:zlib";

export const streamLimit = 12 * 1024 * 1024;

export function archiveStream(chunks: Uint8Array[]) {
  return gzipSync(Buffer.concat(chunks),{level:1}).toString("base64");
}

export function expandSearchEvidence(raw: string) {
  if (!raw.startsWith('{"streamGzip":"')) return raw;
  const {streamGzip,...fields} = JSON.parse(raw);
  const sse = gunzipSync(Buffer.from(streamGzip,"base64"),{maxOutputLength:streamLimit}).toString("utf8");
  return JSON.stringify({...fields,sse});
}
