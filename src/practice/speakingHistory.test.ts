import assert from "node:assert/strict";
import test from "node:test";
import { averageSpeakingScores, createSpeakingAttempt, loadSpeakingAttempts, MAX_SPEAKING_ATTEMPTS, saveSpeakingAttempts } from "./speakingHistory";
import type { SpeakingEvaluation, SpeakingQuestion } from "../shared/practiceTypes";

const question: SpeakingQuestion = {
  id: "part1-home-routines",
  part: 1,
  eyebrow: "Home",
  question: "What part of your day do you enjoy most?",
  cues: [],
  prepSeconds: 0,
  answerSeconds: 45,
};

const evaluation: SpeakingEvaluation = {
  transcript: "I enjoy the quiet morning.",
  summary: "A clear answer.",
  estimatedBand: 6,
  scores: { fluency: 6, lexicalResource: 6.5, grammar: 5.5, pronunciation: 6 },
  strengths: ["Clear idea"],
  priorities: ["Add detail"],
  improvedAnswer: "I enjoy the quiet part of my morning.",
  studyNote: "Add one specific detail.",
  studyCards: [{ kind: "grammar", title: "Articles", body: "Use an article before a singular noun." }],
  evidence: { transcribedWordCount: 5, scoreCeiling: 4, confidence: "low" },
};

test("speaking history stores recent attempts without audio", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => data.get(key) || null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
  const attempts = Array.from({ length: MAX_SPEAKING_ATTEMPTS + 3 }, (_, index) => (
    createSpeakingAttempt(`attempt-${index}`, question, evaluation, index)
  )).reverse();

  saveSpeakingAttempts(storage, "user-1", attempts);
  const loaded = loadSpeakingAttempts(storage, "user-1");

  assert.equal(loaded.length, MAX_SPEAKING_ATTEMPTS);
  assert.equal(loaded[0].id, `attempt-${MAX_SPEAKING_ATTEMPTS + 2}`);
  assert.equal("audioBase64" in loaded[0], false);
});

test("speaking history calculates overall and criterion averages", () => {
  const second = createSpeakingAttempt("second", question, {
    ...evaluation,
    estimatedBand: 7,
    scores: { fluency: 7, lexicalResource: 7.5, grammar: 6.5, pronunciation: 7 },
  });
  const averages = averageSpeakingScores([createSpeakingAttempt("first", question, evaluation), second]);

  assert.deepEqual(averages, {
    estimatedBand: 6.5,
    scores: { fluency: 6.5, lexicalResource: 7, grammar: 6, pronunciation: 6.5 },
  });
});


