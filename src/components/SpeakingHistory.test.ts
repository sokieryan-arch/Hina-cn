import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeakingComparison, SpeakingHistory } from "./SpeakingHistory";
import type { SpeakingAttempt } from "../shared/practiceTypes";

const first: SpeakingAttempt = {
  id: "first",
  questionId: "part1-daily-rhythm",
  question: "What part of your day do you enjoy most?",
  part: 1,
  createdAt: 1_700_000_000_000,
  estimatedBand: 6,
  scores: { fluency: 6, lexicalResource: 6, grammar: 5.5, pronunciation: 6.5 },
  transcript: "I like mornings.",
  summary: "Clear but short.",
  priorities: ["Add a reason"],
  improvedAnswer: "I like mornings because the city feels quiet.",
  studyCards: [],
};

const second: SpeakingAttempt = {
  ...first,
  id: "second",
  createdAt: 1_700_000_100_000,
  estimatedBand: 6.5,
  scores: { fluency: 6.5, lexicalResource: 6.5, grammar: 6, pronunciation: 7 },
};

test("speaking history renders averages and a route back to the prompt", () => {
  const markup = renderToStaticMarkup(React.createElement(SpeakingHistory, {
    attempts: [second, first],
    onPracticeAgain: () => {},
  }));

  assert.match(markup, /Your practice trail/);
  assert.match(markup, /6\.3/);
  assert.match(markup, /Practice again/);
  assert.match(markup, /What part of your day/);
});

test("speaking comparison shows the overall and criterion deltas", () => {
  const markup = renderToStaticMarkup(React.createElement(SpeakingComparison, { previous: first, current: second }));

  assert.match(markup, /Same prompt comparison/);
  assert.match(markup, /6\.0/);
  assert.match(markup, /6\.5/);
  assert.match(markup, /\+0\.5 overall/);
});


