# Email Auth Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Hina-cn's email-based registration, login, and password reset feel production-ready, with readable Chinese UI and honest unavailable states for phone SMS and WeChat.

**Architecture:** Keep the existing auth API and store design. Add API-level tests for the email path, repair `AuthPanel.tsx` copy/error handling, and document SMTP deployment values. Do not change schema or implement real SMS/WeChat production linkage in this iteration.

**Tech Stack:** React 19, Express, Node test runner, TypeScript, PostgreSQL auth stores, existing SMTP notifier.

---

## File Structure

- Modify `src/components/AuthPanel.tsx`: readable Chinese labels, status messages, and error mapping.
- Create `src/components/AuthPanel.test.ts`: server-render checks for Chinese labels and unavailable-service messages.
- Create `src/server/api.auth.test.ts`: API route tests for email register/login/reset and production SMTP missing failure.
- Modify `docs/production-single-ecs.md`: clarify SMTP env and current phone/WeChat state.
- Modify `README.md`: add a short auth readiness note.

## Task 1: API Email Auth Coverage

**Files:**
- Create: `src/server/api.auth.test.ts`
- Read: `src/server/api.ts`
- Read: `src/server/auth/authService.test.ts`

- [ ] **Step 1: Write failing API tests**

Create `src/server/api.auth.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import express from "express";
import { createAuthService } from "./auth/authService.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import { registerApiRoutes } from "./api.js";
import type { ParsedIdentifier, VerificationPurpose } from "./auth/types.js";

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
      createLoginUrl: () => { throw new Error("missing_wechat_app_id"); },
      exchangeCode: async () => { throw new Error("not_used"); },
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
      body: JSON.stringify({ identifier: "sokie@example.com", password: "password-123", code: "123456", displayName: "Sokie" }),
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
      body: JSON.stringify({ identifier: "sokie@example.com", code: "123456", newPassword: "new-password-123" }),
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
```

- [ ] **Step 2: Run test to verify it fails only if behavior is missing**

Run: `npm run test -- src/server/api.auth.test.ts`

Expected: If existing API already supports the behavior, the test may pass. If it fails, the failure should identify the exact API gap.

- [ ] **Step 3: Implement minimal API fix if needed**

Only modify `src/server/api.ts` or `src/server/auth/authService.ts` if Step 2 exposes a real gap. Do not change routes that already work.

- [ ] **Step 4: Re-run API tests**

Run: `npm run test -- src/server/api.auth.test.ts`

Expected: API auth tests pass.

## Task 2: Auth Panel Copy and Error Mapping

**Files:**
- Create: `src/components/AuthPanel.test.ts`
- Modify: `src/components/AuthPanel.tsx`

- [ ] **Step 1: Write failing UI render test**

Create `src/components/AuthPanel.test.ts` with:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AuthPanel } from "./AuthPanel.js";

test("auth panel renders readable Chinese login copy", () => {
  const markup = renderToStaticMarkup(React.createElement(AuthPanel, {
    onAuthed: () => {},
  }));

  assert.match(markup, /登录/);
  assert.match(markup, /注册/);
  assert.match(markup, /忘记密码/);
  assert.match(markup, /手机号或邮箱/);
  assert.match(markup, /进入 Hina/);
  assert.match(markup, /微信登录/);
  assert.doesNotMatch(markup, /�|璐|楠|鎵|寰/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/components/AuthPanel.test.ts`

Expected: FAIL because current copy contains mojibake Chinese.

- [ ] **Step 3: Replace `AuthPanel.tsx` copy**

Update `readableError` to:

```ts
function readableError(message: string) {
  const map: Record<string, string> = {
    invalid_credentials: "账号或密码不对。",
    already_registered: "这个账号已经注册过了。",
    invalid_verification_code: "验证码不对或已过期。",
    weak_password: "密码至少需要 8 位。",
    invalid_phone: "请输入中国大陆手机号。",
    invalid_email: "邮箱格式不太对。",
    user_not_found: "没有找到这个账号。",
    email_not_configured: "邮箱验证码还没有配置好，请稍后再试。",
    phone_verification_unavailable: "手机验证码暂未开放，请先使用邮箱注册。",
    missing_wechat_app_id: "微信登录还没有配置好。",
    missing_wechat_credentials: "微信登录还没有配置好。",
  };
  return map[message] ?? "请求没有成功，请稍后再试。";
}
```

Replace mojibake labels with these strings:

- `登录`
- `注册`
- `忘记密码`
- `昵称`
- `手机号或邮箱`
- `密码`
- `新密码`
- `至少 8 位`
- `验证码`
- `6 位数字`
- `发送`
- `进入 Hina`
- `创建账号`
- `重置密码`
- `微信登录`
- `返回登录`
- `手机号、邮箱和微信入口都在这里。Hina 会继续用朋友的语气聊天，也会在每次回复后给你两条语言提示。`

Fix the development-code status template to:

```ts
setStatus(`验证码已发送到 ${result.maskedTarget}${result.devCode ? `，本地验证码：${result.devCode}` : ""}`);
```

- [ ] **Step 4: Re-run UI test**

Run: `npm run test -- src/components/AuthPanel.test.ts`

Expected: PASS.

## Task 3: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/production-single-ecs.md`

- [ ] **Step 1: Update docs**

Add a short note:

```md
### Auth readiness

Email registration, login, and password reset are the first production-ready auth path. Configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` before enabling production email verification.

Phone verification is intentionally unavailable until Volcengine SMS sign name and template approval are complete. WeChat login requires a public HTTPS domain and an approved WeChat Open Platform website application.
```

- [ ] **Step 2: Verify docs mention SMTP and unavailable states**

Run:

```bash
rg -n "Auth readiness|SMTP_HOST|phone verification|WeChat login" README.md docs/production-single-ecs.md
```

Expected: Both files contain the auth readiness guidance.

## Task 4: Full Verification and Commit

**Files:**
- All files changed above.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all pass. Vite chunk-size warning is acceptable if build exits 0.

- [ ] **Step 2: Inspect git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only auth tests, auth panel, docs, and this plan are changed.

- [ ] **Step 3: Commit**

Run:

```bash
git add src/server/api.auth.test.ts src/components/AuthPanel.test.ts src/components/AuthPanel.tsx README.md docs/production-single-ecs.md docs/superpowers/plans/2026-06-30-email-auth-readiness.md
git commit -m "feat: polish email auth readiness"
```

Expected: commit succeeds.

## Self-Review

- Spec coverage: API email path, readable UI, phone/WeChat honest states, docs, and full verification all have tasks.
- Placeholder scan: no TBD/TODO/fill-in steps are present.
- Type consistency: tests import existing `AuthPanel`, `registerApiRoutes`, `createAuthService`, and `createMemoryAppStore`.
