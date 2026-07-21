import assert from "node:assert/strict";
import test from "node:test";
import { PRESENCE_DEFINITIONS, ambientPresence, resolvePresence } from "./presence.js";

test("ambient presence is stable within each New York half-hour slot", () => {
  const first = new Date("2026-07-22T14:02:00.000Z");
  const second = new Date("2026-07-22T14:28:00.000Z");
  assert.equal(ambientPresence(first), ambientPresence(second));
});

test("sleeping is strongly selected during New York overnight hours", () => {
  const values = [0, 30, 60, 90].map((minutes) => ambientPresence(new Date(Date.UTC(2026, 6, 22, 6, minutes))));
  assert.ok(values.every((status) => ["sleeping", "daydreaming"].includes(status)));
});

test("activity priority is speaking then thinking then preparing", () => {
  assert.equal(resolvePresence({ ambient: "online", preparing: true }), "preparing");
  assert.equal(resolvePresence({ ambient: "online", preparing: true, thinking: true }), "thinking");
  assert.equal(resolvePresence({ ambient: "online", preparing: true, thinking: true, speaking: true }), "speaking");
});

test("ambient statuses are green and activity statuses use their requested colors", () => {
  assert.match(PRESENCE_DEFINITIONS.reading.dotClass, /21A366/);
  assert.match(PRESENCE_DEFINITIONS.preparing.dotClass, /54B9E8/);
  assert.match(PRESENCE_DEFINITIONS.thinking.dotClass, /2457A7/);
  assert.match(PRESENCE_DEFINITIONS.speaking.dotClass, /F29A38/);
});
