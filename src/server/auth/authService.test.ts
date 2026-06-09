import test from "node:test";
import assert from "node:assert/strict";
import { createAuthService } from "./authService.js";
import { createMemoryAuthStores } from "./memoryStores.js";

test("registers with email verification code and blocks duplicate registration", async () => {
  const stores = createMemoryAuthStores();
  const auth = createAuthService({
    stores,
    codeGenerator: () => "123456",
    now: () => new Date("2026-06-09T08:00:00Z"),
    sessionTtlDays: 30,
  });

  await auth.sendCode({ target: "sokie@example.com", purpose: "register" });
  const result = await auth.register({
    identifier: "sokie@example.com",
    code: "123456",
    password: "A-good-password-123",
    displayName: "Sokie",
  });

  assert.equal(result.user.email, "sokie@example.com");
  assert.equal(result.user.displayName, "Sokie");
  assert.ok(result.session.token);

  await auth.sendCode({ target: "sokie@example.com", purpose: "register" });
  await assert.rejects(
    auth.register({
      identifier: "sokie@example.com",
      code: "123456",
      password: "A-good-password-123",
      displayName: "Sokie again",
    }),
    /already_registered/,
  );
});

test("logs in with password and resets forgotten password with a code", async () => {
  const stores = createMemoryAuthStores();
  const auth = createAuthService({
    stores,
    codeGenerator: () => "654321",
    now: () => new Date("2026-06-09T08:00:00Z"),
    sessionTtlDays: 30,
  });

  await auth.sendCode({ target: "+8613812345678", purpose: "register" });
  await auth.register({
    identifier: "+8613812345678",
    code: "654321",
    password: "old-password-123",
  });

  const login = await auth.login({
    identifier: "13812345678",
    password: "old-password-123",
  });
  assert.equal(login.user.phone, "+8613812345678");

  await auth.sendCode({ target: "13812345678", purpose: "reset_password" });
  await auth.resetPassword({
    identifier: "13812345678",
    code: "654321",
    newPassword: "new-password-456",
  });

  await assert.rejects(
    auth.login({ identifier: "13812345678", password: "old-password-123" }),
    /invalid_credentials/,
  );

  const nextLogin = await auth.login({
    identifier: "13812345678",
    password: "new-password-456",
  });
  assert.equal(nextLogin.user.phone, "+8613812345678");
});
