// Keep the bytes supplied by the operator so the original capture can be downloaded.
export function screenshotFrom(input: unknown) {
  if (input == null || input === "") return null;
  if (typeof input !== "string" || input.length > 1_400_000)
    throw Error("截图限 1 MiB");
  const match = /^data:(image\/(?:png|jpeg));base64,([a-zA-Z0-9+/=]+)$/.exec(
    input,
  );
  if (!match) throw Error("截图需为 PNG 或 JPEG");
  const bytes = Uint8Array.from(atob(match[2]), (c) => c.charCodeAt(0));
  const magic =
    match[1] === "image/png"
      ? [137, 80, 78, 71, 13, 10, 26, 10]
      : [255, 216, 255];
  if (bytes.length > 1_048_576 || !magic.every((v, i) => bytes[i] === v))
    throw Error("截图格式或大小无效");
  return { mime: match[1], bytes };
}
