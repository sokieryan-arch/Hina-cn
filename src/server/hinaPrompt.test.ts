import assert from "node:assert/strict";
import test from "node:test";
import { HINA_SYSTEM_INSTRUCTION } from "./hinaPrompt.js";

test("Hina prompt restores Gemini-style liveliness and emoji guidance", () => {
  assert.match(HINA_SYSTEM_INSTRUCTION, /Gemini international Hina/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /3-5 natural emoji/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /tiny Sherlock mode/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /gummy bears/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /rent-free/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /70-130 words/i);
});

test("Hina prompt requires concrete correction and stealable expression tips", () => {
  assert.match(HINA_SYSTEM_INSTRUCTION, /Tip 1/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /original/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /suggestion/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /Where are you based now/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /Tip 2/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /Chinese meaning/i);
  assert.match(HINA_SYSTEM_INSTRUCTION, /JSON schema/i);
});
