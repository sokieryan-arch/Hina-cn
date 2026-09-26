import assert from "node:assert/strict";
import test from "node:test";
import { findSpeakingQuestion, SPEAKING_QUESTIONS, speakingQuestionsForPart } from "./speakingQuestions";

test("speaking practice ships original prompts for all three parts", () => {
  assert.ok(speakingQuestionsForPart(1).length >= 3);
  assert.ok(speakingQuestionsForPart(2).length >= 2);
  assert.ok(speakingQuestionsForPart(3).length >= 3);
  assert.equal(new Set(SPEAKING_QUESTIONS.map((question) => question.id)).size, SPEAKING_QUESTIONS.length);
});

test("part 2 prompts include preparation time and cue points", () => {
  const question = findSpeakingQuestion("part2-city-place");
  assert.equal(question?.prepSeconds, 60);
  assert.equal(question?.answerSeconds, 120);
  assert.ok((question?.cues.length || 0) >= 3);
});


