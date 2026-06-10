import assert from "node:assert/strict";
import test from "node:test";
import { createCompositeNotifier, createSmtpNotifier, getEmailHealth } from "./notifiers.js";

const emailTarget = { kind: "email" as const, value: "sokie@example.com" };
const phoneTarget = { kind: "phone" as const, value: "+8613812345678" };

test("production email verification fails clearly when SMTP is not configured", async () => {
  const notifier = createCompositeNotifier({
    env: { NODE_ENV: "production" },
    fallbackNotifier: { sendCode: async () => undefined },
  });

  await assert.rejects(
    notifier.sendCode(emailTarget, "123456", "register"),
    /email_not_configured/,
  );
});

test("production phone verification is unavailable until real SMS is implemented", async () => {
  const notifier = createCompositeNotifier({
    env: {
      NODE_ENV: "production",
      VOLCENGINE_SMS_ACCESS_KEY_ID: "sms-key",
      VOLCENGINE_SMS_SECRET_ACCESS_KEY: "sms-secret",
    },
    fallbackNotifier: { sendCode: async () => undefined },
  });

  await assert.rejects(
    notifier.sendCode(phoneTarget, "123456", "register"),
    /phone_verification_unavailable/,
  );
});

test("SMTP notifier sends email verification through configured transport", async () => {
  const sent: Array<{ from: string; to: string; subject: string; text: string }> = [];
  const notifier = createSmtpNotifier({
    env: {
      SMTP_HOST: "smtp.example.cn",
      SMTP_PORT: "465",
      SMTP_USER: "mailer@example.cn",
      SMTP_PASS: "smtp-secret",
      SMTP_FROM: "Hina <no-reply@example.cn>",
    },
    createTransport: () => ({
      async sendMail(message) {
        sent.push(message);
      },
    }),
  });

  assert.ok(notifier);
  await notifier.sendCode(emailTarget, "654321", "reset_password");

  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, "Hina <no-reply@example.cn>");
  assert.equal(sent[0].to, "sokie@example.com");
  assert.match(sent[0].subject, /Reset your Hina password/);
  assert.match(sent[0].text, /654321/);
  assert.equal(JSON.stringify(sent).includes("smtp-secret"), false);
});

test("email health reports SMTP configuration without exposing secrets", () => {
  const health = getEmailHealth({
    NODE_ENV: "production",
    SMTP_HOST: "smtp.example.cn",
    SMTP_USER: "mailer@example.cn",
    SMTP_PASS: "smtp-secret",
  });

  assert.equal(health.configured, true);
  assert.equal(health.ok, true);
  assert.equal(JSON.stringify(health).includes("smtp-secret"), false);
  assert.equal(JSON.stringify(health).includes("mailer@example.cn"), false);
});
