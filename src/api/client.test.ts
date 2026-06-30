import test from "node:test";
import assert from "node:assert/strict";
import { api } from "./client.js";

test("uploadAvatar sends multipart form data without forcing JSON content type", async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return new Response(JSON.stringify({
      user: {
        id: "user-1",
        displayName: "Sokie",
        avatarUrl: "/uploads/avatars/user-1.png",
        hasPassword: true,
        hasWeChat: false,
      },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    const file = new File([new Uint8Array([1, 2, 3])], "avatar.png", { type: "image/png" });
    const result = await api.uploadAvatar(file);

    assert.equal(calls.length, 1);
    assert.equal(calls[0].input, "/api/profile/avatar");
    assert.equal(calls[0].init?.method, "POST");
    assert.equal(calls[0].init?.body instanceof FormData, true);
    assert.equal(new Headers(calls[0].init?.headers).has("Content-Type"), false);
    assert.equal(result.user.avatarUrl, "/uploads/avatars/user-1.png");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
