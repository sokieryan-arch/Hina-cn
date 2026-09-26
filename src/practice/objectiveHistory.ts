import type { ObjectiveAttempt, ObjectivePracticeSkill } from "../shared/practiceTypes";

const STORAGE_PREFIX = "hina-objective-attempts-v1";
export const MAX_OBJECTIVE_ATTEMPTS = 12;

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function objectiveHistoryStorageKey(ownerId: string) {
  return `${STORAGE_PREFIX}:${ownerId || "guest"}`;
}

function parseAttempt(value: unknown): ObjectiveAttempt | null {
  if (!value || typeof value !== "object") return null;
  const attempt = value as Partial<ObjectiveAttempt>;
  const valid = typeof attempt.id === "string"
    && (attempt.skill === "reading" || attempt.skill === "listening")
    && typeof attempt.createdAt === "number"
    && typeof attempt.correct === "number"
    && typeof attempt.total === "number"
    && typeof attempt.estimatedBand === "number"
    && typeof attempt.durationSeconds === "number"
    && Array.isArray(attempt.sectionScores)
    && Boolean(attempt.answers)
    && Array.isArray(attempt.wrongQuestionIds);
  return valid ? attempt as ObjectiveAttempt : null;
}

export function loadObjectiveAttempts(storage: StorageLike | null, ownerId: string) {
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(objectiveHistoryStorageKey(ownerId)) || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseAttempt).filter((attempt): attempt is ObjectiveAttempt => Boolean(attempt)).sort((left, right) => right.createdAt - left.createdAt).slice(0, MAX_OBJECTIVE_ATTEMPTS);
  } catch {
    return [];
  }
}

export function saveObjectiveAttempts(storage: StorageLike | null, ownerId: string, attempts: ObjectiveAttempt[]) {
  const next = attempts.slice(0, MAX_OBJECTIVE_ATTEMPTS);
  storage?.setItem(objectiveHistoryStorageKey(ownerId), JSON.stringify(next));
  return next;
}

export function objectiveAttemptsForSkill(attempts: ObjectiveAttempt[], skill: ObjectivePracticeSkill) {
  return attempts.filter((attempt) => attempt.skill === skill);
}


