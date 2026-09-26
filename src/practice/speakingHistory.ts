import type { SpeakingAttempt, SpeakingEvaluation, SpeakingQuestion, SpeakingScores } from "../shared/practiceTypes";

const STORAGE_PREFIX = "hina-speaking-attempts-v2";
export const MAX_SPEAKING_ATTEMPTS = 30;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const SCORE_KEYS: Array<keyof SpeakingScores> = ["fluency", "lexicalResource", "grammar", "pronunciation"];

export function speakingHistoryStorageKey(ownerId: string) {
  return `${STORAGE_PREFIX}:${ownerId || "guest"}`;
}

function isAttempt(value: unknown): value is SpeakingAttempt {
  if (!value || typeof value !== "object") return false;
  const attempt = value as Partial<SpeakingAttempt>;
  return typeof attempt.id === "string"
    && typeof attempt.questionId === "string"
    && typeof attempt.question === "string"
    && (attempt.part === 1 || attempt.part === 2 || attempt.part === 3)
    && typeof attempt.createdAt === "number"
    && typeof attempt.estimatedBand === "number"
    && Boolean(attempt.scores)
    && SCORE_KEYS.every((key) => typeof attempt.scores?.[key] === "number")
    && typeof attempt.transcript === "string"
    && typeof attempt.summary === "string"
    && Array.isArray(attempt.priorities)
    && typeof attempt.improvedAnswer === "string"
    && Array.isArray(attempt.studyCards);
}

export function loadSpeakingAttempts(storage: StorageLike | null, ownerId: string): SpeakingAttempt[] {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(speakingHistoryStorageKey(ownerId)) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter(isAttempt).sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_SPEAKING_ATTEMPTS)
      : [];
  } catch {
    return [];
  }
}

export function saveSpeakingAttempts(storage: StorageLike | null, ownerId: string, attempts: SpeakingAttempt[]) {
  const next = attempts.slice(0, MAX_SPEAKING_ATTEMPTS);
  storage?.setItem(speakingHistoryStorageKey(ownerId), JSON.stringify(next));
  return next;
}

export function createSpeakingAttempt(
  id: string,
  question: SpeakingQuestion,
  evaluation: SpeakingEvaluation,
  createdAt = Date.now(),
): SpeakingAttempt {
  return {
    id,
    questionId: question.id,
    question: question.question,
    part: question.part,
    createdAt,
    estimatedBand: evaluation.estimatedBand,
    scores: evaluation.scores,
    transcript: evaluation.transcript,
    summary: evaluation.summary,
    priorities: evaluation.priorities,
    improvedAnswer: evaluation.improvedAnswer,
    studyCards: evaluation.studyCards,
  };
}

export function averageSpeakingScores(attempts: SpeakingAttempt[]) {
  if (attempts.length === 0) return null;
  const total = attempts.reduce((result, attempt) => {
    result.estimatedBand += attempt.estimatedBand;
    for (const key of SCORE_KEYS) result.scores[key] += attempt.scores[key];
    return result;
  }, {
    estimatedBand: 0,
    scores: { fluency: 0, lexicalResource: 0, grammar: 0, pronunciation: 0 },
  });

  const rounded = (value: number) => Math.round((value / attempts.length) * 10) / 10;
  return {
    estimatedBand: rounded(total.estimatedBand),
    scores: {
      fluency: rounded(total.scores.fluency),
      lexicalResource: rounded(total.scores.lexicalResource),
      grammar: rounded(total.scores.grammar),
      pronunciation: rounded(total.scores.pronunciation),
    },
  };
}


