import assert from "node:assert/strict";
import test from "node:test";
import { getChatPlaceholderCandidates, pickChatPlaceholder } from "./chatPlaceholder.js";

test("chat placeholders come from the i18n resource as short single-line copy", () => {
  const candidates = getChatPlaceholderCandidates();

  assert.equal(candidates.length, 15);
  assert.equal(new Set(candidates).size, candidates.length);
  assert.ok(candidates.every((value) => value.length <= 32));
  assert.ok(candidates.every((value) => !/[\r\n]/.test(value)));
});

test("placeholder selection can be deterministic and spans the full resource list", () => {
  const candidates = getChatPlaceholderCandidates();

  assert.equal(pickChatPlaceholder({ random: () => 0 }), candidates[0]);
  assert.equal(pickChatPlaceholder({ random: () => 0.999999 }), candidates.at(-1));
});

test("future presence and festival contexts safely fall back to general copy", () => {
  const general = getChatPlaceholderCandidates();

  assert.deepEqual(getChatPlaceholderCandidates({ presence: "reading" }), general);
  assert.deepEqual(getChatPlaceholderCandidates({ festival: "mid-autumn" }), general);
});
