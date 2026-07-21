import test from "node:test";
import assert from "node:assert/strict";
import {
  buildProactivePrompt,
  normalizeProactiveSettings,
  shouldCreateProactiveNudge,
} from "./proactive.js";

test("does not create proactive nudges inside quiet hours", () => {
  const settings = normalizeProactiveSettings({
    enabled: true,
    minHoursBetweenNudges: 12,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
  });

  assert.equal(
    shouldCreateProactiveNudge(settings, {
      now: new Date("2026-06-09T23:30:00+08:00"),
      lastInteractionAt: new Date("2026-06-08T08:00:00+08:00"),
    }),
    false,
  );
});

test("creates proactive nudges after the configured gap outside quiet hours", () => {
  const settings = normalizeProactiveSettings({
    enabled: true,
    minHoursBetweenNudges: 12,
    quietHoursStart: "22:00",
    quietHoursEnd: "08:00",
    favoriteTopics: ["films", "IELTS", "food", "ignored"],
  });

  assert.deepEqual(settings.favoriteTopics, ["Films & TV", "IELTS", "Food", "ignored"]);
  assert.equal(
    shouldCreateProactiveNudge(settings, {
      now: new Date("2026-06-09T15:00:00+08:00"),
      lastInteractionAt: new Date("2026-06-08T21:00:00+08:00"),
    }),
    true,
  );
});

test("builds a concise Hina-style proactive prompt with recent context", () => {
  const prompt = buildProactivePrompt({
    localDate: "2026-06-09",
    favoriteTopics: ["films", "IELTS"],
    recentMessages: ["I am tired", "Need better phrases"],
  });

  assert.match(prompt, /Hina/);
  assert.match(prompt, /films, IELTS/);
  assert.match(prompt, /I am tired/);
  assert.match(prompt, /under 55 words/);
});
