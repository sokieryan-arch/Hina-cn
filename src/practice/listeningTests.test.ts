import assert from "node:assert/strict";
import test from "node:test";
import { LISTENING_QUESTIONS, LISTENING_SECTIONS } from "./listeningTests";

test("listening test contains four complete sections and forty ordered questions", () => {
  assert.equal(LISTENING_SECTIONS.length, 4);
  assert.equal(LISTENING_QUESTIONS.length, 40);
  assert.deepEqual(LISTENING_QUESTIONS.map((question) => question.number), Array.from({ length: 40 }, (_, index) => index + 1));
  assert.equal(new Set(LISTENING_QUESTIONS.map((question) => question.id)).size, 40);
  assert.ok(LISTENING_SECTIONS.every((section) => section.segments.length >= 5 && section.questions.length === 10));
  assert.ok(LISTENING_QUESTIONS.every((question) => question.acceptedAnswers.length && question.evidence && question.explanation));
});


