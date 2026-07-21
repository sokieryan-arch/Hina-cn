import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { registerApiRoutes } from "./api.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";

const currentUser = {
  id: "space-user",
  displayName: "Sokie",
  avatarUrl: null,
  phone: null,
  email: "sokie@example.com",
  hasPassword: true,
  hasWeChat: false,
  createdAt: "2026-07-20T01:00:00.000Z",
};

function limiter() {
  return { consume: () => ({ allowed: true, retryAfterMs: 0 }) } as any;
}

async function withServer(run: (baseUrl: string, store: ReturnType<typeof createMemoryAppStore>) => Promise<void>) {
  const app = express();
  app.use(express.json());
  const store = createMemoryAppStore();
  registerApiRoutes({
    app,
    store,
    auth: { async getCurrentUser() { return currentUser; } } as any,
    wechat: {} as any,
    provider: {} as any,
    speech: { speak: async () => null },
    chatLimiter: limiter(),
    ttsLimiter: limiter(),
  });
  const server = app.listen(0);
  try {
    const address = server.address();
    const port = address && typeof address === "object" ? address.port : 0;
    await run(`http://127.0.0.1:${port}`, store);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

const headers = { Authorization: "Bearer test", "Content-Type": "application/json" };

test("Space APIs isolate notes and support wishlist CRUD", async () => {
  await withServer(async (baseUrl, store) => {
    await store.space.saveNote({
      userId: currentUser.id,
      category: "grammar",
      title: "Past tense",
      body: "Use went.",
      example: null,
      original: "I go",
      suggestion: "I went",
      sourceMessageId: null,
      dedupeKey: "past-tense",
    });
    await store.space.saveNote({
      userId: "someone-else",
      category: "culture",
      title: "Private",
      body: "Not yours",
      example: null,
      original: null,
      suggestion: null,
      sourceMessageId: null,
      dedupeKey: "private",
    });

    const notes = await fetch(`${baseUrl}/api/space/notes`, { headers }).then((response) => response.json()) as any;
    assert.equal(notes.notes.length, 1);
    assert.equal(notes.notes[0].title, "Past tense");

    const createdResponse = await fetch(`${baseUrl}/api/space/wishlist`, {
      method: "POST",
      headers,
      body: JSON.stringify({ kind: "goal", title: "30-day streak", progress: 10 }),
    });
    const created = await createdResponse.json() as any;
    assert.equal(createdResponse.status, 201);

    const updated = await fetch(`${baseUrl}/api/space/wishlist/${created.item.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ completed: true }),
    }).then((response) => response.json()) as any;
    assert.equal(updated.item.completed, true);
    assert.equal(updated.item.progress, 100);
  });
});

test("capsule list hides body until unlock and open", async () => {
  await withServer(async (baseUrl) => {
    const createdResponse = await fetch(`${baseUrl}/api/space/capsules`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        title: "Future hello",
        body: "A secret sentence",
        unlockAt: new Date(Date.now() + 86_400_000).toISOString(),
      }),
    });
    const created = await createdResponse.json() as any;
    assert.equal(created.capsule.body, null);
    const openResponse = await fetch(`${baseUrl}/api/space/capsules/${created.capsule.id}/open`, { method: "POST", headers });
    assert.equal(openResponse.status, 403);
  });
});

test("moments are global while relationship counts real conversation days", async () => {
  await withServer(async (baseUrl, store) => {
    const now = new Date();
    await store.space.addMomentIfDue({ body: "A Brooklyn coffee note.", occasion: null, now, nextDueAt: new Date(now.getTime() + 48 * 3_600_000) });
    await store.messages.addMessage({ userId: currentUser.id, role: "user", text: "hello", type: "response" });
    await store.messages.addMessage({ userId: currentUser.id, role: "model", text: "hi", type: "response" });
    await store.messages.addMessage({ userId: currentUser.id, role: "model", text: "tip", type: "tip" });

    const moments = await fetch(`${baseUrl}/api/space/moments`, { headers }).then((response) => response.json()) as any;
    assert.equal(moments.moments.length, 1);
    const relationship = await fetch(`${baseUrl}/api/space/relationship`, { headers }).then((response) => response.json()) as any;
    assert.equal(relationship.relationship.messages, 2);
    assert.equal(relationship.relationship.sharedMemories, 1);
  });
});
