import assert from "node:assert/strict";
import test from "node:test";
import { getRuntimeEnvironment, shouldUseSecureCookies } from "./runtimeEnv.js";

test("APP_ENV=staging is a deployed environment without secure cookies on HTTP test NODE_ENV", () => {
  const env = getRuntimeEnvironment({
    APP_ENV: "staging",
    NODE_ENV: "development",
  });

  assert.equal(env.appEnv, "staging");
  assert.equal(env.isStaging, true);
  assert.equal(env.isDeployed, true);
  assert.equal(env.isProduction, false);
  assert.equal(shouldUseSecureCookies({ APP_ENV: "staging", NODE_ENV: "development" }), false);
});

test("production secure cookies are still driven by NODE_ENV", () => {
  assert.equal(shouldUseSecureCookies({ APP_ENV: "production", NODE_ENV: "production" }), true);
});
