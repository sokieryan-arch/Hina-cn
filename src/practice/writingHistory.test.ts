import assert from "node:assert/strict";
import test from "node:test";
import type { WritingEvaluation, WritingTask2Prompt } from "../shared/practiceTypes";
import {
  averageWritingScores,
  createWritingAttempt,
  loadWritingAttempts,
  MAX_WRITING_ATTEMPTS,
  saveWritingAttempts,
  writingAttemptsForTask,
} from "./writingHistory";

const prompt: WritingTask2Prompt = { id: "task2-test", topic: "Test", question: "Discuss both views.", taskType: "task2", minimumWords: 250, durationMinutes: 40 };
const evaluation: WritingEvaluation = {
  summary: "A developing response.",
  estimatedBand: 5.5,
  scores: { taskResponse: 5.5, coherence: 6, lexicalResource: 5.5, grammar: 5 },
  strengths: [],
  priorities: ["Develop each idea."],
  sentenceFeedback: [],
  improvedParagraph: "A clearer paragraph.",
  studyCards: [],
  evidence: { wordCount: 260, scoreCeiling: null, confidence: "medium", taskType: "task2", minimumWords: 250, unsupportedNumbers: [] },
};

test("writing history keeps recent account-scoped attempts", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
  const attempts = Array.from({ length: MAX_WRITING_ATTEMPTS + 2 }, (_, index) => (
    createWritingAttempt(`attempt-${index}`, prompt, `Essay ${index}`, evaluation, index)
  )).reverse();

  saveWritingAttempts(storage, "writer-1", attempts);
  const loaded = loadWritingAttempts(storage, "writer-1");
  assert.equal(loaded.length, MAX_WRITING_ATTEMPTS);
  assert.equal(loaded[0].id, `attempt-${MAX_WRITING_ATTEMPTS + 1}`);
  assert.equal(loadWritingAttempts(storage, "writer-2").length, 0);
});

test("writing history separates Task 1 and Task 2 attempts", () => {
  const task2Attempt = createWritingAttempt("task2", prompt, "Essay", evaluation);
  const task1Attempt = { ...task2Attempt, id: "task1", taskType: "task1" as const };
  assert.deepEqual(writingAttemptsForTask([task1Attempt, task2Attempt], "task1").map((attempt) => attempt.id), ["task1"]);
  assert.deepEqual(writingAttemptsForTask([task1Attempt, task2Attempt], "task2").map((attempt) => attempt.id), ["task2"]);
});

test("writing history calculates criterion averages", () => {
  const second = createWritingAttempt("second", prompt, "Essay", {
    ...evaluation,
    estimatedBand: 6.5,
    scores: { taskResponse: 6.5, coherence: 7, lexicalResource: 6.5, grammar: 6 },
  });
  const averages = averageWritingScores([createWritingAttempt("first", prompt, "Essay", evaluation), second]);
  assert.deepEqual(averages, {
    estimatedBand: 6,
    scores: { taskResponse: 6, coherence: 6.5, lexicalResource: 6, grammar: 5.5 },
  });
});


