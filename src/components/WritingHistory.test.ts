import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { WritingAttempt } from "../shared/practiceTypes";
import { WritingComparison, WritingHistory } from "./WritingHistory";

const first: WritingAttempt = {
  id: "first",
  taskType: "task2",
  questionId: "task2-test",
  question: "Discuss both views.",
  topic: "Education",
  createdAt: 1_700_000_000_000,
  essay: "First draft.",
  estimatedBand: 5.5,
  scores: { taskResponse: 5.5, coherence: 6, lexicalResource: 5.5, grammar: 5 },
  summary: "Developing.",
  priorities: [],
  sentenceFeedback: [],
  improvedParagraph: "",
  studyCards: [],
};
const second: WritingAttempt = {
  ...first,
  id: "second",
  estimatedBand: 6.5,
  scores: { taskResponse: 6.5, coherence: 6.5, lexicalResource: 6.5, grammar: 6.5 },
};

test("writing history renders averages and rewrite action", () => {
  const markup = renderToStaticMarkup(React.createElement(WritingHistory, { attempts: [second, first], taskType: "task2", title: "The argument gets sharper.", onPracticeAgain: () => {} }));
  assert.match(markup, /Draft history/);
  assert.match(markup, /6\.0/);
  assert.match(markup, /Rewrite/);
});

test("writing comparison renders criterion movement", () => {
  const markup = renderToStaticMarkup(React.createElement(WritingComparison, { previous: first, current: second, taskType: "task2" }));
  assert.match(markup, /Same task comparison/);
  assert.match(markup, /\+1\.0 overall/);
});

test("Task 1 history uses Task Achievement language", () => {
  const task1Attempt = { ...first, taskType: "task1" as const, questionId: "task1-test" };
  const markup = renderToStaticMarkup(React.createElement(WritingHistory, { attempts: [task1Attempt], taskType: "task1", title: "Descriptions get more selective.", onPracticeAgain: () => {} }));
  assert.match(markup, /Task achievement/);
  assert.match(markup, /Descriptions get more selective/);
});


