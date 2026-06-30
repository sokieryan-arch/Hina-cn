import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { registerApiRoutes } from "./api.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import type { AppStore } from "./store/types.js";

function okLimiter() {
  return {
    consume() {
      return { allowed: true, retryAfterMs: 0 };
    },
  };
}

async function withProfileServer(run: (input: { baseUrl: string; store: AppStore; userId: string; uploadsRoot: string }) => Promise<void>) {
  const app = express();
  app.use(express.json());
  const store = createMemoryAppStore();
  const user = await store.auth.users.create({
    displayName: "Sokie",
    email: "sokie@example.com",
    passwordHash: "hash",
    emailVerifiedAt: new Date("2026-06-30T08:00:00Z"),
  });
  const uploadsRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hina-avatar-"));
  registerApiRoutes({
    app,
    store,
    auth: {
      async getCurrentUser(token: string | null) {
        return token === "test-token" ? user : null;
      },
      async createSessionForUser(nextUser: typeof user) {
        return {
          user: {
            id: nextUser.id,
            displayName: nextUser.displayName,
            avatarUrl: nextUser.avatarUrl,
            phone: nextUser.phone,
            email: nextUser.email,
            hasPassword: Boolean(nextUser.passwordHash),
            hasWeChat: Boolean(nextUser.hasWeChat),
          },
          session: {
            token: "next-token",
            userId: nextUser.id,
            expiresAt: new Date("2026-07-30T08:00:00Z").toISOString(),
            createdAt: new Date("2026-06-30T08:00:00Z"),
          },
        };
      },
    } as any,
    wechat: {} as any,
    provider: {} as any,
    speech: { speak: async () => null },
    chatLimiter: okLimiter() as any,
    ttsLimiter: okLimiter() as any,
    uploadsRoot,
  });

  const server = app.listen(0);
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const port = address && typeof address === "object" ? address.port : 0;
    await run({ baseUrl: `http://127.0.0.1:${port}`, store, userId: user.id, uploadsRoot });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await fs.rm(uploadsRoot, { recursive: true, force: true });
  }
}

function authHeaders() {
  return { Authorization: "Bearer test-token" };
}

function pngBlob() {
  const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return new Blob([pngHeader], { type: "image/png" });
}

test("POST /api/profile/avatar uploads an image and updates the user avatar", async () => {
  await withProfileServer(async ({ baseUrl, uploadsRoot }) => {
    const form = new FormData();
    form.set("avatar", pngBlob(), "avatar.png");

    const response = await fetch(`${baseUrl}/api/profile/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    const body = await response.json() as any;

    assert.equal(response.status, 200);
    assert.match(body.user.avatarUrl, /^\/uploads\/avatars\/.+\.png$/);

    const storedPath = path.join(uploadsRoot, body.user.avatarUrl.replace(/^\/uploads\//, ""));
    const stat = await fs.stat(storedPath);
    assert.equal(stat.size, 8);
  });
});

test("POST /api/profile/avatar preserves image bytes that end in CRLF", async () => {
  await withProfileServer(async ({ baseUrl, uploadsRoot }) => {
    const bytes = Uint8Array.from([0x89, 0x50, 0x0d, 0x0a]);
    const form = new FormData();
    form.set("avatar", new Blob([bytes], { type: "image/png" }), "avatar.png");

    const response = await fetch(`${baseUrl}/api/profile/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    const body = await response.json() as any;

    assert.equal(response.status, 200);
    const storedPath = path.join(uploadsRoot, body.user.avatarUrl.replace(/^\/uploads\//, ""));
    assert.deepEqual(await fs.readFile(storedPath), Buffer.from(bytes));
  });
});

test("POST /api/profile/avatar rejects non-image uploads", async () => {
  await withProfileServer(async ({ baseUrl }) => {
    const form = new FormData();
    form.set("avatar", new Blob([new Uint8Array([1, 2, 3])], { type: "text/plain" }), "note.txt");

    const response = await fetch(`${baseUrl}/api/profile/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    const body = await response.json() as any;

    assert.equal(response.status, 400);
    assert.equal(body.error, "avatar_type_not_supported");
  });
});

test("POST /api/profile/avatar rejects images over 10MB", async () => {
  await withProfileServer(async ({ baseUrl }) => {
    const form = new FormData();
    form.set("avatar", new Blob([new Uint8Array((10 * 1024 * 1024) + 1)], { type: "image/png" }), "huge.png");

    const response = await fetch(`${baseUrl}/api/profile/avatar`, {
      method: "POST",
      headers: authHeaders(),
      body: form,
    });
    const body = await response.json() as any;

    assert.equal(response.status, 400);
    assert.equal(body.error, "avatar_too_large");
  });
});

test("PUT /api/profile preserves avatar when avatarUrl is omitted", async () => {
  await withProfileServer(async ({ baseUrl, store, userId }) => {
    await store.auth.users.updateProfile(userId, { avatarUrl: "/uploads/avatars/old.png" });

    const response = await fetch(`${baseUrl}/api/profile`, {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ displayName: "Sokie New" }),
    });
    const body = await response.json() as any;

    assert.equal(response.status, 200);
    assert.equal(body.user.displayName, "Sokie New");
    assert.equal(body.user.avatarUrl, "/uploads/avatars/old.png");
  });
});
