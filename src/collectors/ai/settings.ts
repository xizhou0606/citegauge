export const samplingSettings = {
  timeout: 55_000,
  maxOutputTokens: 2_000,
  maxRetries: 0,
  include: { responseBody: true },
} as const;

export function rawEvidence(body: unknown): string {
  const raw = JSON.stringify(body);
  if (!raw) throw Error("未收到原始响应");
  if (new TextEncoder().encode(raw).length > 650_000)
    throw Error("响应超过单次证据容量");
  return raw;
}
