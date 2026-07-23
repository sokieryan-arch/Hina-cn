import assert from "node:assert/strict";
import test from "node:test";
import { createWeChatMiniAuth } from "./wechatMini.js";

test("exchanges a Mini Program code without returning credentials to callers", async () => {
  let requestedUrl = "";
  const auth = createWeChatMiniAuth({
    appId: "mini-app-id",
    appSecret: "server-only-secret",
    fetchImpl: (async (input: string | URL | Request) => {
      requestedUrl = String(input);
      return new Response(JSON.stringify({
        openid: "openid-1",
        unionid: "union-1",
        session_key: "wechat-session-key",
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  });

  const result = await auth.exchangeCode("login-code");
  assert.equal(result.openid, "openid-1");
  assert.equal(result.unionid, "union-1");
  assert.equal(result.sessionKey, "wechat-session-key");
  assert.match(requestedUrl, /jscode2session/);
  assert.match(requestedUrl, /js_code=login-code/);
  assert.equal(JSON.stringify(result).includes("server-only-secret"), false);
});

test("rejects invalid WeChat code exchange responses", async () => {
  const auth = createWeChatMiniAuth({
    appId: "mini-app-id",
    appSecret: "server-only-secret",
    fetchImpl: (async () => new Response(JSON.stringify({
      errcode: 40029,
      errmsg: "invalid code",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as typeof fetch,
  });

  await assert.rejects(() => auth.exchangeCode("bad-code"), /wechat_mini_code_exchange_failed/);
});
