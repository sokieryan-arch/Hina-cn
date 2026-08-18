import test from "node:test";
import assert from "node:assert/strict";
import { speechUtf8Bytes, splitSpeechText } from "./speechChunks.js";

test("keeps a short utterance in one speech chunk", () => {
  assert.deepEqual(splitSpeechText("Hello, Hina."), ["Hello, Hina."]);
});

test("splits long Chinese speech on natural sentence boundaries within the UTF-8 budget", () => {
  const text = "今天发生了一件很有意思的事。我们慢慢说，也顺便练习更自然的表达！".repeat(18);
  const chunks = splitSpeechText(text, 180);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => speechUtf8Bytes(chunk) <= 180));
  assert.equal(chunks.join("").replaceAll(" ", ""), text);
});

test("falls back to whitespace when an English sentence exceeds the byte budget", () => {
  const text = "This deliberately long sentence keeps adding ordinary words so the speech queue can split it without cutting through a word boundary or silently dropping the ending.";
  const chunks = splitSpeechText(text, 72);

  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => speechUtf8Bytes(chunk) <= 72));
  assert.equal(chunks.join(" ").replaceAll(/\s+/g, " "), text);
});

test("rejects an unusably small byte limit", () => {
  assert.throws(() => splitSpeechText("你好", 3), /invalid_speech_chunk_limit/);
});
