import test from "node:test";
import assert from "node:assert/strict";
import { createWeChatOAuth } from "./wechat.js";

test("builds a website OAuth URL with snsapi_login and state", () => {
  const wechat = createWeChatOAuth({
    appId: "wx123",
    appSecret: "secret",
    appUrl: "https://hina.example.cn",
    stateStore: new Map(),
  });

  const url = new URL(wechat.createLoginUrl("state-123"));

  assert.equal(url.origin, "https://open.weixin.qq.com");
  assert.equal(url.searchParams.get("appid"), "wx123");
  assert.equal(url.searchParams.get("scope"), "snsapi_login");
  assert.equal(url.searchParams.get("state"), "state-123");
  assert.match(url.searchParams.get("redirect_uri") ?? "", /\/api\/auth\/wechat\/callback/);
});

test("rejects callbacks with an unknown state", async () => {
  const wechat = createWeChatOAuth({
    appId: "wx123",
    appSecret: "secret",
    appUrl: "https://hina.example.cn",
    stateStore: new Map(),
  });

  await assert.rejects(
    wechat.exchangeCode({ code: "code", state: "missing" }),
    /invalid_wechat_state/,
  );
});
