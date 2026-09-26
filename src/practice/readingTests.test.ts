import assert from "node:assert/strict";
import test from "node:test";
import { READING_PASSAGES, READING_QUESTIONS } from "./readingTests";

test("reading test contains three complete original passages and forty ordered questions", () => {
  assert.equal(READING_PASSAGES.length, 3);
  assert.equal(READING_QUESTIONS.length, 40);
  assert.deepEqual(READING_QUESTIONS.map((question) => question.number), Array.from({ length: 40 }, (_, index) => index + 1));
  assert.equal(new Set(READING_QUESTIONS.map((question) => question.id)).size, 40);
  assert.ok(READING_PASSAGES.every((passage) => passage.paragraphs.length >= 6));
  assert.ok(READING_QUESTIONS.every((question) => question.acceptedAnswers.length && question.evidence && question.explanation));
});


