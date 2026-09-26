import assert from "node:assert/strict";
import test from "node:test";
import { isObjectiveAnswerCorrect, normalizeObjectiveAnswer, objectiveBand, objectiveStudyCards } from "./objectiveScoring";
import type { ObjectiveQuestion } from "../shared/practiceTypes";

const question: ObjectiveQuestion = {
  id: "q1", number: 1, kind: "text", prompt: "Answer", acceptedAnswers: ["Recycled timber"],
  evidence: "Engineers added recycled timber screens.", explanation: "The material is stated directly.",
};

test("objective answers ignore case, punctuation, and repeated spaces", () => {
  assert.equal(normalizeObjectiveAnswer("  RECYClED   timber! "), "recycled timber");
  assert.equal(isObjectiveAnswerCorrect(question, "recycled timber."), true);
  assert.equal(isObjectiveAnswerCorrect(question, "timber"), false);
});

test("reading and listening use deterministic raw-score tables", () => {
  assert.equal(objectiveBand("reading", 30), 7);
  assert.equal(objectiveBand("reading", 39), 9);
  assert.equal(objectiveBand("listening", 26), 6.5);
  assert.equal(objectiveBand("listening", 32), 7.5);
});

test("objective review cards are limited to the first five missed answers", () => {
  const questions = Array.from({ length: 8 }, (_, index) => ({ ...question, id: `q${index}`, number: index + 1 }));
  const cards = objectiveStudyCards("reading", questions, {});
  assert.equal(cards.length, 5);
  assert.match(cards[0].body, /No answer/);
  assert.match(cards[0].body, /Correct answer/);
  assert.match(cards[0].body, /Evidence/);
});


