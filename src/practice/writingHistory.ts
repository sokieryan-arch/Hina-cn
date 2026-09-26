import type { WritingAttempt, WritingEvaluation, WritingPrompt, WritingScores, WritingTaskType } from "../shared/practiceTypes";

const STORAGE_PREFIX = "hina-writing-attempts-v1";
export const MAX_WRITING_ATTEMPTS = 20;
const SCORE_KEYS: Array<keyof WritingScores> = ["taskResponse", "coherence", "lexicalResource", "grammar"];

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function writingHistoryStorageKey(ownerId: string) {
  return `${STORAGE_PREFIX}:${ownerId || "guest"}`;
}

function parseAttempt(value: unknown): WritingAttempt | null {
  if (!value || typeof value !== "object") return null;
  const attempt = value as Partial<WritingAttempt>;
  const valid = typeof attempt.id === "string"
    && typeof attempt.questionId === "string"
    && typeof attempt.question === "string"
    && typeof attempt.topic === "string"
    && typeof attempt.createdAt === "number"
    && typeof attempt.essay === "string"
    && typeof attempt.estimatedBand === "number"
    && Boolean(attempt.scores)
    && SCORE_KEYS.every((key) => typeof attempt.scores?.[key] === "number")
    && typeof attempt.summary === "string"
    && Array.isArray(attempt.priorities)
    && Array.isArray(attempt.sentenceFeedback)
    && typeof attempt.improvedParagraph === "string"
    && Array.isArray(attempt.studyCards);
  if (!valid) return null;
  return {
    ...attempt,
    taskType: attempt.taskType === "task1" ? "task1" : "task2",
  } as WritingAttempt;
}

export function loadWritingAttempts(storage: StorageLike | null, ownerId: string) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(writingHistoryStorageKey(ownerId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(parseAttempt)
      .filter((attempt): attempt is WritingAttempt => Boolean(attempt))
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, MAX_WRITING_ATTEMPTS);
  } catch {
    return [];
  }
}

export function saveWritingAttempts(storage: StorageLike | null, ownerId: string, attempts: WritingAttempt[]) {
  const next = attempts.slice(0, MAX_WRITING_ATTEMPTS);
  storage?.setItem(writingHistoryStorageKey(ownerId), JSON.stringify(next));
  return next;
}

export function createWritingAttempt(
  id: string,
  prompt: WritingPrompt,
  essay: string,
  evaluation: WritingEvaluation,
  createdAt = Date.now(),
): WritingAttempt {
  return {
    id,
    taskType: prompt.taskType,
    questionId: prompt.id,
    question: prompt.question,
    topic: prompt.topic,
    createdAt,
    essay,
    estimatedBand: evaluation.estimatedBand,
    scores: evaluation.scores,
    summary: evaluation.summary,
    priorities: evaluation.priorities,
    sentenceFeedback: evaluation.sentenceFeedback,
    improvedParagraph: evaluation.improvedParagraph,
    studyCards: evaluation.studyCards,
  };
}

export function averageWritingScores(attempts: WritingAttempt[]) {
  if (attempts.length === 0) return null;
  const total = attempts.reduce((result, attempt) => {
    result.estimatedBand += attempt.estimatedBand;
    for (const key of SCORE_KEYS) result.scores[key] += attempt.scores[key];
    return result;
  }, {
    estimatedBand: 0,
    scores: { taskResponse: 0, coherence: 0, lexicalResource: 0, grammar: 0 },
  });
  const rounded = (value: number) => Math.round((value / attempts.length) * 10) / 10;
  return {
    estimatedBand: rounded(total.estimatedBand),
    scores: {
      taskResponse: rounded(total.scores.taskResponse),
      coherence: rounded(total.scores.coherence),
      lexicalResource: rounded(total.scores.lexicalResource),
      grammar: rounded(total.scores.grammar),
    },
  };
}

export function writingAttemptsForTask(attempts: WritingAttempt[], taskType: WritingTaskType) {
  return attempts.filter((attempt) => attempt.taskType === taskType);
}


