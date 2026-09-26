import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeHistoryRecord, SpeakingAttempt, WritingAttempt } from "../shared/practiceTypes";
import { buildPracticeSummaries, overallPracticeBand, recommendNextPractice } from "./practiceProgress";

function speaking(id: string, createdAt: number, band: number): PracticeHistoryRecord {
  const attempt: SpeakingAttempt = {
    id, createdAt, estimatedBand: band, questionId: "q1", question: "Question", part: 1,
    scores: { fluency: band, lexicalResource: band - 0.5, grammar: band - 1, pronunciation: band },
    transcript: "answer", summary: "summary", priorities: [], improvedAnswer: "answer", studyCards: [],
  };
  return { id, skill: "speaking", createdAt, attempt };
}

function writing(id: string, createdAt: number, band: number): PracticeHistoryRecord {
  const attempt: WritingAttempt = {
    id, createdAt, estimatedBand: band, questionId: "w1", question: "Question", topic: "Topic", taskType: "task2", essay: "Essay",
    scores: { taskResponse: band, coherence: band, lexicalResource: band - 0.5, grammar: band },
    summary: "summary", priorities: [], sentenceFeedback: [], improvedParagraph: "paragraph", studyCards: [],
  };
  return { id, skill: "writing", createdAt, attempt };
}

test("practice summaries calculate latest trend and evidence-based weakness", () => {
  const summaries = buildPracticeSummaries([
    speaking("s2", 200, 6.5), speaking("s1", 100, 6), writing("w1", 150, 5.5),
  ]);
  const speakingSummary = summaries.find((summary) => summary.skill === "speaking")!;
  assert.equal(speakingSummary.latestBand, 6.5);
  assert.equal(speakingSummary.trend, 0.5);
  assert.equal(speakingSummary.weakness, "Grammar");
  assert.equal(overallPracticeBand(summaries), 6);
});

test("recommendation fills missing baselines before targeting the lowest score", () => {
  let summaries = buildPracticeSummaries([speaking("s1", 100, 6)]);
  assert.equal(recommendNextPractice(summaries).skill, "listening");
  summaries = buildPracticeSummaries([
    speaking("s1", 400, 6.5), writing("w1", 300, 5.5),
    { id: "r1", skill: "reading", createdAt: 200, attempt: { id: "r1", skill: "reading", createdAt: 200, correct: 30, total: 40, estimatedBand: 7, durationSeconds: 1, sectionScores: [10, 10, 10], answers: {}, wrongQuestionIds: [] } },
    { id: "l1", skill: "listening", createdAt: 100, attempt: { id: "l1", skill: "listening", createdAt: 100, correct: 30, total: 40, estimatedBand: 7, durationSeconds: 1, sectionScores: [10, 10, 10, 10], answers: {}, wrongQuestionIds: [] } },
  ]);
  assert.equal(recommendNextPractice(summaries).skill, "writing");
  assert.match(recommendNextPractice(summaries).reason, /vocabulary/i);
});


