export async function api(path, body) {
  return requestJSON("/api/" + path, body);
}

export async function requestJSON(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith("/api/auth/")) {
      window.dispatchEvent(new Event("session-expired"));
    }
    if (path === "/api/auth/sign-in/username" && response.status === 401) {
      throw Error("账号或密码不正确");
    }
    if (response.status === 429) throw Error("尝试过于频繁，请稍后再登录");
    throw Error(
      result.error?.message || result.message || result.error || "请求失败",
    );
  }
  return result;
}
