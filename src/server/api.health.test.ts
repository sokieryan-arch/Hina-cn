import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { registerApiRoutes } from "./api.js";

test("GET /api/health returns redacted health status", async () => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://user:super-secret@db.example.cn/hina";
  const app = express();
  registerApiRoutes({
    app,
    store: {} as any,
    auth: {} as any,
    wechat: {} as any,
    provider: {} as any,
    speech: {} as any,
    chatLimiter: {} as any,
    ttsLimiter: {} as any,
    healthChecks: {
      database: async () => ({ ok: false, error: "password=super-secret" }),
      redis: async () => ({ ok: true }),
    },
  });

  const server = app.listen(0);
  try {
    const address = server.address();
    assert.equal(typeof address, "object");
    const port = address && typeof address === "object" ? address.port : 0;
    const response = await fetch(`http://127.0.0.1:${port}/api/health`);
    const body = await response.json() as any;

    assert.equal(response.status, 503);
    assert.equal(body.database.error.includes("super-secret"), false);
  } finally {
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
});
