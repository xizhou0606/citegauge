import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { postReport } from "../src/delivery/chat.ts";
import { sendReport } from "../src/delivery/report.ts";
import { fixture } from "./d1-fixture.ts";
import { monitorFrom } from "../src/domain/monitor.ts";

const env = { SLACK_BOT_TOKEN: "xoxb-test", SLACK_SIGNING_SECRET: "test",
  SLACK_CHANNEL_ID: "CTEST", TELEGRAM_BOT_TOKEN: "123:test", TELEGRAM_CHAT_ID: "-100123" };

test("两个官方 Chat SDK 适配器向指定会话投递 Markdown", async () => {
  const requests = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks).toString();
    requests.push({ path: req.url, body });
    res.setHeader("Content-Type", "application/json");
    if (req.url.startsWith("/slack/"))
      res.end(JSON.stringify({ ok: true, user_id: "UBOT", bot_id: "BBOT", ts: "1.1", channel: "CTEST", message: { text: "report" } }));
    else {
      const user = { id: 123, is_bot: true, first_name: "Test", username: "fixture_bot" };
      res.end(JSON.stringify({ ok: true, result: req.url.endsWith("/getMe") ? user :
        { message_id: 1, date: 1, chat: { id: -100123, type: "supergroup" }, from: user, text: "report" } }));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  process.env.SLACK_API_URL = base + "/slack/";
  process.env.TELEGRAM_API_BASE_URL = base;
  try {
    await postReport(env, "slack", "CTEST", "**Result** · test");
    await postReport(env, "telegram", "-100123", "**Result** · test");
    assert.ok(requests.some(r => r.path.endsWith("/chat.postMessage") && r.body.includes("CTEST")));
    assert.ok(requests.some(r => /\/send(Rich)?Message$/.test(r.path) && r.body.includes("-100123")));
  } finally {
    delete process.env.SLACK_API_URL;
    delete process.env.TELEGRAM_API_BASE_URL;
    server.closeAllConnections();
    server.close();
  }
});

test("按所选监测项和时间窗发送一次，保留正确分母，同一请求重试不重发", async () => {
  const f = await fixture();
  try {
    const m = monitorFrom({ channel: "豆包网页", brand: "品牌甲", domain: "example.com", question: "推荐哪种工具？" });
    await f.pool.query("INSERT INTO monitors(id,config) VALUES(?1,?2)", [m.id, m]);
    const now = Date.now();
    await f.pool.query("INSERT INTO runs(id,monitor,at,state) VALUES ('r',?1,?2,'failed')", [m.id, now]);
    const body = { key: crypto.randomUUID(), platform: "telegram", end: now };
    const calls = [];
    const post = async (...args) => { calls.push(args); };
    assert.equal((await sendReport(f.pool, {}, m, body, post)).status, 409);
    for (let i = 0; i < 2; i++) assert.equal((await sendReport(f.pool, env, m, body, post)).status, 200);
    assert.equal(calls.length, 1);
    const [, platform, address, message] = calls[0];
    assert.equal(platform, "telegram");
    assert.equal(address, env.TELEGRAM_CHAT_ID);
    assert.match(message, /品牌甲/);
    assert.match(message, /豆包网页/);
    assert.match(message, /官网引用 · 尚无可判定样本/);
  } finally { await f.close(); }
});
