import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBillingSummary,
  canUseChat,
  getResetAt,
  getUsageDate,
  readBillingLimits,
} from "./billing.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";

test("uses 30 free chats per day and unlimited Pro by default", () => {
  const limits = readBillingLimits({});

  assert.equal(limits.freeDailyChatLimit, 30);
  assert.equal(limits.proDailyChatLimit, null);
});

test("builds free and Pro billing summaries", () => {
  const now = new Date("2026-06-30T09:30:00+08:00");
  const free = buildBillingSummary({
    plan: "free",
    chatCount: 12,
    now,
    limits: readBillingLimits({ FREE_DAILY_CHAT_LIMIT: "30" }),
  });

  assert.equal(free.plan, "free");
  assert.equal(free.isPro, false);
  assert.equal(free.dailyLimit, 30);
  assert.equal(free.usedToday, 12);
  assert.equal(free.remainingToday, 18);
  assert.equal(canUseChat(free), true);

  const pro = buildBillingSummary({
    plan: "pro",
    chatCount: 999,
    now,
    limits: readBillingLimits({ PRO_DAILY_CHAT_LIMIT: "0" }),
  });

  assert.equal(pro.plan, "pro");
  assert.equal(pro.isPro, true);
  assert.equal(pro.dailyLimit, null);
  assert.equal(pro.remainingToday, null);
  assert.equal(canUseChat(pro), true);
});

test("blocks free chat when the daily limit is exhausted", () => {
  const summary = buildBillingSummary({
    plan: "free",
    chatCount: 30,
    now: new Date("2026-06-30T12:00:00+08:00"),
    limits: readBillingLimits({ FREE_DAILY_CHAT_LIMIT: "30" }),
  });

  assert.equal(summary.remainingToday, 0);
  assert.equal(canUseChat(summary), false);
});

test("calculates usage date and reset time from the server day", () => {
  const now = new Date("2026-06-30T23:59:00+08:00");

  assert.equal(getUsageDate(now), "2026-06-30");
  assert.equal(getResetAt(now).toISOString(), "2026-06-30T16:00:00.000Z");
});

test("memory billing store defaults, increments, grants Pro, and resets by date", async () => {
  const store = createMemoryAppStore();
  const userId = "user-1";
  const dayOne = new Date("2026-06-30T09:00:00+08:00");
  const dayTwo = new Date("2026-07-01T09:00:00+08:00");

  const initial = await store.billing.getBillingSummary(userId, dayOne);
  assert.equal(initial.plan, "free");
  assert.equal(initial.usedToday, 0);
  assert.equal(initial.remainingToday, 30);

  const afterIncrement = await store.billing.incrementChatUsage(userId, dayOne);
  assert.equal(afterIncrement.usedToday, 1);
  assert.equal(afterIncrement.remainingToday, 29);

  const nextDay = await store.billing.getBillingSummary(userId, dayTwo);
  assert.equal(nextDay.usedToday, 0);
  assert.equal(nextDay.remainingToday, 30);

  const pro = await store.billing.setPlan(userId, "pro", null, dayTwo);
  assert.equal(pro.plan, "pro");
  assert.equal(pro.isPro, true);
  assert.equal(pro.dailyLimit, null);
  assert.equal(pro.remainingToday, null);
});
