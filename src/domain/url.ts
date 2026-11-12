export function httpURL(value: unknown) {
  if (typeof value !== "string" || value.length > 2048)
    throw Error("网址格式无效");
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw Error("仅支持 HTTP(S) 网址");
  return url;
}
