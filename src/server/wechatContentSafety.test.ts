import assert from "node:assert/strict";
import test from "node:test";
import { createWeChatContentSafety } from "./wechatContentSafety.js";

test("checks Mini Program text and reuses the server access token", async () => {
  const requests: Array<{ url: string; body?: string }> = [];
  const safety = createWeChatContentSafety({
    appId: "mini-app-id",
    appSecret: "server-only-secret",
    enabled: true,
    now: () => 1_000_000,
    fetchImpl: (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      requests.push({ url, body: typeof init?.body === "string" ? init.body : undefined });
      if (url.includes("/cgi-bin/token")) {
        return new Response(JSON.stringify({ access_token: "access-token", expires_in: 7200 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        errcode: 0,
        result: { suggest: "pass", label: 100 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  });

  const first = await safety.checkText({ openid: "openid-1", content: "Hello Hina" });
  const second = await safety.checkText({ openid: "openid-1", content: "One more message" });
  assert.equal(first.allowed, true);
  assert.equal(second.allowed, true);
  assert.equal(requests.filter((request) => request.url.includes("/cgi-bin/token")).length, 1);
  assert.equal(requests.filter((request) => request.url.includes("/wxa/msg_sec_check")).length, 2);
  assert.match(requests[1].body ?? "", /"openid":"openid-1"/);
});

test("blocks reviewed content and bypasses checks when disabled", async () => {
  const reviewed = createWeChatContentSafety({
    appId: "mini-app-id",
    appSecret: "server-only-secret",
    enabled: true,
    fetchImpl: (async (input: string | URL | Request) => {
      if (String(input).includes("/cgi-bin/token")) {
        return new Response(JSON.stringify({ access_token: "access-token", expires_in: 7200 }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({
        errcode: 0,
        result: { suggest: "review", label: 20001 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch,
  });
  assert.equal((await reviewed.checkText({ openid: "openid-1", content: "text" })).allowed, false);

  const disabled = createWeChatContentSafety({
    enabled: false,
    fetchImpl: (async () => {
      throw new Error("must not fetch");
    }) as typeof fetch,
  });
  assert.deepEqual(await disabled.checkText({ openid: "openid-1", content: "text" }), { allowed: true });
});
