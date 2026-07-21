import assert from "node:assert/strict";
import test from "node:test";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import { buildRelationshipSummary, nextMomentDue, noteDedupeKey, toClientCapsule } from "./space.js";

test("study notes deduplicate equivalent tips per user", async () => {
  const store = createMemoryAppStore();
  const tip = { type: "correction" as const, title: "Past tense", body: "Use went.", original: "I go", suggestion: "I went" };
  const input = {
    userId: "user-1",
    category: "grammar" as const,
    title: tip.title,
    body: tip.body,
    original: tip.original,
    suggestion: tip.suggestion,
    example: null,
    sourceMessageId: null,
    dedupeKey: noteDedupeKey(tip),
  };
  assert.ok(await store.space.saveNote(input));
  assert.equal(await store.space.saveNote(input), null);
  assert.equal((await store.space.listNotes("user-1")).length, 1);
  assert.equal((await store.space.listNotes("user-2")).length, 0);
});

test("capsule content is never exposed before unlock and explicit open", async () => {
  const store = createMemoryAppStore();
  const now = new Date("2026-07-22T08:00:00.000Z");
  const record = await store.space.createCapsule({
    userId: "user-1",
    title: "For later",
    body: "Secret future note",
    unlockAt: new Date("2026-07-23T08:00:00.000Z"),
  });
  assert.equal(toClientCapsule(record, now).body, null);
  assert.equal(await store.space.openCapsule("user-1", record.id, now), null);
  const opened = await store.space.openCapsule("user-1", record.id, new Date("2026-07-24T08:00:00.000Z"));
  assert.equal(toClientCapsule(opened!, new Date("2026-07-24T08:00:00.000Z")).body, "Secret future note");
});

test("relationship summary uses inclusive known days and China conversation streaks", () => {
  const summary = buildRelationshipSummary({
    createdAt: new Date("2026-07-20T01:00:00.000Z"),
    now: new Date("2026-07-22T12:00:00.000Z"),
    counts: {
      messageCount: 12,
      conversationDates: ["2026-07-20", "2026-07-21", "2026-07-22"],
      notesCount: 4,
      completedGoals: 2,
    },
  });
  assert.equal(summary.knownDays, 3);
  assert.equal(summary.sharedMemories, 3);
  assert.equal(summary.currentStreak, 3);
  assert.equal(summary.messages, 12);
});

test("moment due time stays between 48 and 72 hours", () => {
  const now = new Date("2026-07-22T08:00:00.000Z");
  const hours = (nextMomentDue(now).getTime() - now.getTime()) / 3_600_000;
  assert.ok(hours >= 48 && hours <= 72);
});
