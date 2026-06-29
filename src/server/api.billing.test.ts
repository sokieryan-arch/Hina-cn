import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerApiRoutes } from "./api.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import type { AppStore } from "./store/types.js";
import type { ChatMessageInput, LanguagePartnerResponse } from "./providers/types.js";

const user = {
  id: "user-1",
  displayName: "Sokie",
  avatarUrl: null,
  phone: null,
  email: "sokie@example.com",
  passwordHash: "hash",
  phoneVerifiedAt: null,
  emailVerifiedAt: new Date("2026-06-30T08:00:00Z"),
  hasWeChat: false,
  createdAt: new Date("2026-06-30T08:00:00Z"),
  updatedAt: new Date("2026-06-30T08:00:00Z"),
};

function okLimiter() {
  return {
    consume() {
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

function createProvider(options: { fail?: boolean } = {}) {
  const calls: ChatMessageInput[][] = [];
  return {
    calls,
    async chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse> {
      calls.push(messages);
      if (options.fail) throw new Error("ark_failed");
      return {
        response: "Omg hi! Hina is here with emergency gummy energy ✨",
        tips: [
          {
            type: "correction",
            title: "Tiny grammar fix",
            body: "Say \"I went\" for a finished past action.",
            original: "I go",
            suggestion: "I went",
          },
          {
            type: "expression",
            title: "Phrase to steal",
            body: "Emergency gummy energy means a tiny burst of silly motivation.",
          },
        ],
      };
    },
    async draftProactiveOpener() {
      return this.chat([{ role: "user", text: "open" }]);
    },
  };
}

async function withServer(input: { store?: AppStore; provider?: ReturnType<typeof createProvider> }, run: (baseUrl: string, store: AppStore, provider: ReturnType<typeof createProvider>) => Promise<void>) {
  const app = express();
  app.use(express.json());
  const store = input.store ?? createMemoryAppStore();
  const provider = input.provider ?? createProvider();
  registerApiRoutes({
    app,
    store,
    auth: {
      async getCurrentUser(token: string | null) {
        return token === "test-token" ? user : null;
      },
    } as any,
    wechat: {} as any,
    provider,
    speech: { speak: async () => null },
    chatLimiter: okLimiter() as any,
    ttsLimiter: okLimiter() as any,
  });

  const server = app.listen(0);
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const port = address && typeof address === "object" ? address.port : 0;
    await run(`http://127.0.0.1:${port}`, store, provider);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}

function authHeaders() {
  return {
    Authorization: "Bearer test-token",
    "Content-Type": "application/json",
  };
}

test("GET /api/billing/me returns the free daily chat quota", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/billing/me`, { headers: authHeaders() });
    const body = await response.json() as any;

    assert.equal(response.status, 200);
    assert.equal(body.billing.plan, "free");
    assert.equal(body.billing.dailyLimit, 30);
    assert.equal(body.billing.usedToday, 0);
    assert.equal(body.billing.remainingToday, 30);
  });
});

test("POST /api/billing/checkout returns billing_not_ready", async () => {
  await withServer({}, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/billing/checkout`, {
      method: "POST",
      headers: authHeaders(),
    });
    const body = await response.json() as any;

    assert.equal(response.status, 503);
    assert.equal(body.error, "billing_not_ready");
  });
});

test("free user over daily quota gets quota_exceeded before provider call", async () => {
  const store = createMemoryAppStore();
  for (let index = 0; index < 30; index += 1) {
    await store.billing.incrementChatUsage(user.id);
  }

  await withServer({ store }, async (baseUrl, _store, provider) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [{ role: "user", text: "hello" }] }),
    });
    const body = await response.json() as any;

    assert.equal(response.status, 402);
    assert.equal(body.error, "quota_exceeded");
    assert.equal(body.billing.remainingToday, 0);
    assert.equal(provider.calls.length, 0);
  });
});

test("successful chat increments usage once after model response", async () => {
  await withServer({}, async (baseUrl, store, provider) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [{ role: "user", text: "I go yesterday" }] }),
    });
    const body = await response.json() as any;
    const billing = await store.billing.getBillingSummary(user.id);

    assert.equal(response.status, 200);
    assert.equal(body.messages.length, 3);
    assert.equal(provider.calls.length, 1);
    assert.equal(billing.usedToday, 1);
    assert.equal(billing.remainingToday, 29);
  });
});

test("provider failure does not increment usage", async () => {
  const provider = createProvider({ fail: true });

  await withServer({ provider }, async (baseUrl, store) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [{ role: "user", text: "hello" }] }),
    });
    const billing = await store.billing.getBillingSummary(user.id);

    assert.equal(response.status, 500);
    assert.equal(billing.usedToday, 0);
  });
});

test("Pro user bypasses daily quota", async () => {
  const store = createMemoryAppStore();
  for (let index = 0; index < 30; index += 1) {
    await store.billing.incrementChatUsage(user.id);
  }
  await store.billing.setPlan(user.id, "pro", null);

  await withServer({ store }, async (baseUrl, _store, provider) => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ messages: [{ role: "user", text: "hello" }] }),
    });
    const body = await response.json() as any;

    assert.equal(response.status, 200);
    assert.equal(body.messages.length, 3);
    assert.equal(provider.calls.length, 1);
  });
});
