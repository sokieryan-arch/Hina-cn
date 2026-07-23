import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { registerApiRoutes } from "./api.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import type { UserRecord } from "./auth/types.js";

function limiter() {
  return { consume: () => ({ allowed: true, retryAfterMs: 0 }) } as any;
}

function publicUser(user: UserRecord) {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    email: user.email,
    hasPassword: Boolean(user.passwordHash),
    hasWeChat: Boolean(user.hasWeChat),
    createdAt: user.createdAt.toISOString(),
  };
}

async function withServer(run: (input: {
  baseUrl: string;
  store: ReturnType<typeof createMemoryAppStore>;
}) => Promise<void>) {
  const app = express();
  app.use(express.json());
  const store = createMemoryAppStore();
  const tokens = new Map<string, string>();
  let tokenCounter = 0;

  registerApiRoutes({
    app,
    store,
    auth: {
      async getCurrentUser(token: string | null) {
        const userId = token ? tokens.get(token) : null;
        return userId ? store.auth.users.findById(userId) : null;
      },
      async createSessionForUser(user: UserRecord) {
        const token = `mini-token-${++tokenCounter}`;
        tokens.set(token, user.id);
        return {
          user: publicUser(user),
          session: {
            token,
            userId: user.id,
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            createdAt: new Date(),
          },
        };
      },
      async sendCode() {
        return {
          maskedTarget: "so***@example.com",
          expiresAt: new Date(Date.now() + 600_000).toISOString(),
        };
      },
      async verifyIdentifierCode({ identifier }: { identifier: string }) {
        return { kind: "email", value: identifier.trim().toLowerCase() };
      },
    } as any,
    wechat: {} as any,
    wechatMini: {
      isConfigured() {
        return true;
      },
      async exchangeCode() {
        return { openid: "mini-openid-1", unionid: "union-1" };
      },
    },
    provider: {} as any,
    speech: { speak: async () => null },
    chatLimiter: limiter(),
    ttsLimiter: limiter(),
  });

  const server = app.listen(0);
  try {
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    await run({ baseUrl: `http://127.0.0.1:${port}`, store });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

async function miniLogin(baseUrl: string) {
  const response = await fetch(`${baseUrl}/api/auth/wechat-mini/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "wx-login-code" }),
  });
  assert.equal(response.status, 200);
  return response.json() as Promise<any>;
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

test("mini login reuses the same local user and onboarding follows the safety profile", async () => {
  await withServer(async ({ baseUrl }) => {
    const first = await miniLogin(baseUrl);
    assert.equal(first.needsOnboarding, true);

    const saved = await fetch(`${baseUrl}/api/account/safety-profile`, {
      method: "PUT",
      headers: headers(first.session.token),
      body: JSON.stringify({
        birthDate: "1995-05-20",
        adultConfirmed: true,
        privacyAccepted: true,
      }),
    });
    assert.equal(saved.status, 200);

    const second = await miniLogin(baseUrl);
    assert.equal(second.user.id, first.user.id);
    assert.equal(second.needsOnboarding, false);
  });
});

test("email linking merges mini data into the existing web account", async () => {
  await withServer(async ({ baseUrl, store }) => {
    const target = await store.auth.users.create({
      displayName: "Sokie",
      email: "sokie@example.com",
      passwordHash: "hash",
      emailVerifiedAt: new Date(),
      avatarUrl: "/uploads/web-avatar.png",
    });
    await store.messages.addMessage({
      userId: target.id,
      role: "user",
      text: "Web hello",
      type: "response",
    });

    const login = await miniLogin(baseUrl);
    await store.messages.addMessage({
      userId: login.user.id,
      role: "user",
      text: "Mini hello",
      type: "response",
    });
    await store.space.createWishlist({
      userId: login.user.id,
      kind: "goal",
      title: "Thirty-day streak",
      details: null,
      targetDate: null,
      progress: 10,
      completed: false,
    });

    const codeResponse = await fetch(`${baseUrl}/api/auth/link/email/send-code`, {
      method: "POST",
      headers: headers(login.session.token),
      body: JSON.stringify({ email: "sokie@example.com" }),
    });
    assert.equal(codeResponse.status, 200);

    const mergeResponse = await fetch(`${baseUrl}/api/auth/link/email/confirm`, {
      method: "POST",
      headers: headers(login.session.token),
      body: JSON.stringify({ email: "sokie@example.com", code: "123456" }),
    });
    assert.equal(mergeResponse.status, 200);
    const merged = await mergeResponse.json() as any;
    assert.equal(merged.user.id, target.id);
    assert.equal(merged.user.displayName, "Sokie");
    assert.equal(merged.user.avatarUrl, "/uploads/web-avatar.png");

    const exported = await fetch(`${baseUrl}/api/account/export`, {
      headers: headers(merged.session.token),
    }).then((response) => response.json()) as any;
    assert.deepEqual(
      exported.messages.map((message: { text: string }) => message.text).sort(),
      ["Mini hello", "Web hello"],
    );
    assert.equal(exported.wishlist.length, 1);
    assert.equal(await store.auth.users.findById(login.user.id), null);
  });
});

test("account export is scoped and deletion removes the current mini account", async () => {
  await withServer(async ({ baseUrl, store }) => {
    const login = await miniLogin(baseUrl);
    await store.messages.addMessage({
      userId: login.user.id,
      role: "user",
      text: "Only mine",
      type: "response",
    });
    await store.messages.addMessage({
      userId: "another-user",
      role: "user",
      text: "Private elsewhere",
      type: "response",
    });

    const exported = await fetch(`${baseUrl}/api/account/export`, {
      headers: headers(login.session.token),
    }).then((response) => response.json()) as any;
    assert.deepEqual(exported.messages.map((message: { text: string }) => message.text), ["Only mine"]);
    assert.equal(JSON.stringify(exported).includes("ARK_API_KEY"), false);

    const missingConfirmation = await fetch(`${baseUrl}/api/account`, {
      method: "DELETE",
      headers: headers(login.session.token),
      body: JSON.stringify({ confirmation: "NO" }),
    });
    assert.equal(missingConfirmation.status, 400);

    const deleted = await fetch(`${baseUrl}/api/account`, {
      method: "DELETE",
      headers: headers(login.session.token),
      body: JSON.stringify({ confirmation: "DELETE" }),
    });
    assert.equal(deleted.status, 200);
    assert.equal(await store.auth.users.findById(login.user.id), null);
  });
});
