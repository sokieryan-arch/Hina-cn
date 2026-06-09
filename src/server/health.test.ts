import test from "node:test";
import assert from "node:assert/strict";
import { buildHealthStatus } from "./health.js";

test("reports memory-mode development health without exposing secrets", async () => {
  const health = await buildHealthStatus({
    env: {
      NODE_ENV: "development",
      DATABASE_URL: "",
      REDIS_URL: "",
      ARK_API_KEY: "",
      ARK_CHAT_MODEL: "",
    },
    uptimeSeconds: () => 12,
    checks: {
      database: async () => ({ ok: true }),
      redis: async () => ({ ok: true }),
    },
  });

  assert.equal(health.ok, true);
  assert.equal(health.database.mode, "memory");
  assert.equal(health.redis.mode, "memory");
  assert.equal(health.model.provider, "demo");
  assert.equal(JSON.stringify(health).includes("ark-key"), false);
});

test("reports production database and redis check failures without secret values", async () => {
  const health = await buildHealthStatus({
    env: {
      NODE_ENV: "production",
      DATABASE_URL: "postgres://secret-user:secret-pass@db.example.cn/hina",
      REDIS_URL: "redis://:secret-pass@redis.example.cn:6379",
      ARK_API_KEY: "ark-secret-value",
      ARK_CHAT_MODEL: "doubao-model",
    },
    uptimeSeconds: () => 3,
    checks: {
      database: async () => ({ ok: false, error: "connection refused: password=secret-pass" }),
      redis: async () => ({ ok: true }),
    },
  });

  const serialized = JSON.stringify(health);
  assert.equal(health.ok, false);
  assert.equal(health.database.mode, "postgres");
  assert.equal(health.database.ok, false);
  assert.equal(health.redis.ok, true);
  assert.equal(health.model.provider, "ark");
  assert.equal(serialized.includes("secret-pass"), false);
  assert.equal(serialized.includes("ark-secret-value"), false);
});
