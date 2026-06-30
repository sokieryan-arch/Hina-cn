import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createAuthService } from "./auth/authService.js";
import type { ParsedIdentifier, VerificationPurpose } from "./auth/types.js";
import { registerApiRoutes } from "./api.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";

function createTestApp(env: NodeJS.ProcessEnv = {}) {
  const app = express();
  app.use(express.json());
  const store = createMemoryAppStore();
  const sent: Array<{ target: ParsedIdentifier; code: string; purpose: VerificationPurpose }> = [];
  const auth = createAuthService({
    stores: store.auth,
    codeGenerator: () => "123456",
    notifier: {
      async sendCode(target, code, purpose) {
        if (env.NODE_ENV === "production" && target.kind === "email" && env.SMTP_HOST !== "configured") {
          throw Object.assign(new Error("email_not_configured"), { statusCode: 503 });
        }
        sent.push({ target, code, purpose });
      },
    },
  });

  registerApiRoutes({
    app,
    store,
    auth,
    wechat: {
      createLoginUrl: () => {
        throw new Error("missing_wechat_app_id");
      },
      exchangeCode: async () => {
        throw new Error("not_used");
      },
    } as any,
    provider: {} as any,
    speech: {} as any,
    chatLimiter: { consume: () => ({ allowed: true }) } as any,
    ttsLimiter: { consume: () => ({ allowed: true }) } as any,
  });

  return { app, sent };
}

test("email register, login, and password reset work through auth API", async () => {
  const { app, sent } = createTestApp();
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const codeResponse = await fetch(`${baseUrl}/api/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "sokie@example.com", purpose: "register" }),
    });
    assert.equal(codeResponse.status, 200);
    assert.equal(sent[0].code, "123456");

    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "sokie@example.com",
        password: "password-123",
        code: "123456",
        displayName: "Sokie",
      }),
    });
    assert.equal(registerResponse.status, 200);
    assert.match(registerResponse.headers.get("set-cookie") ?? "", /hina_session=/);

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "sokie@example.com", password: "password-123" }),
    });
    assert.equal(loginResponse.status, 200);

    await fetch(`${baseUrl}/api/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "sokie@example.com", purpose: "reset_password" }),
    });
    const resetResponse = await fetch(`${baseUrl}/api/auth/password/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "sokie@example.com",
        code: "123456",
        newPassword: "new-password-123",
      }),
    });
    assert.equal(resetResponse.status, 200);

    const nextLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "sokie@example.com", password: "new-password-123" }),
    });
    assert.equal(nextLogin.status, 200);
  } finally {
    server.close();
  }
});

test("production email send returns email_not_configured when SMTP is missing", async () => {
  const { app } = createTestApp({ NODE_ENV: "production" });
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as any).port}`;
  try {
    const response = await fetch(`${baseUrl}/api/auth/send-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target: "sokie@example.com", purpose: "register" }),
    });
    const body = await response.json() as { error: string };
    assert.equal(response.status, 503);
    assert.equal(body.error, "email_not_configured");
  } finally {
    server.close();
  }
});
