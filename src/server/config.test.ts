import test from "node:test";
import assert from "node:assert/strict";
import { validateRuntimeEnv } from "./config.js";

test("requires production secrets and persistent storage", () => {
  assert.throws(
    () => validateRuntimeEnv({
      NODE_ENV: "production",
      SESSION_SECRET: "change-me-in-production",
      DATABASE_URL: "",
      ARK_API_KEY: "",
      ARK_CHAT_MODEL: "",
    }),
    /Missing required production environment variables: SESSION_SECRET, DATABASE_URL, ARK_API_KEY, ARK_CHAT_MODEL/,
  );
});

test("allows development to run without database and model keys", () => {
  const config = validateRuntimeEnv({
    NODE_ENV: "development",
    SESSION_SECRET: "",
    DATABASE_URL: "",
    ARK_API_KEY: "",
    ARK_CHAT_MODEL: "",
  });

  assert.equal(config.isProduction, false);
  assert.deepEqual(config.missingProductionKeys, []);
});

test("accepts production when required environment is present", () => {
  const config = validateRuntimeEnv({
    NODE_ENV: "production",
    SESSION_SECRET: "a-long-production-secret-value",
    DATABASE_URL: "postgres://user:pass@example.cn:5432/hina",
    ARK_API_KEY: "ark-key",
    ARK_CHAT_MODEL: "doubao-model",
  });

  assert.equal(config.isProduction, true);
  assert.deepEqual(config.missingProductionKeys, []);
});
