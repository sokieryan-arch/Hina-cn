import type { ObjectivePracticeSkill } from "../shared/practiceTypes";

const STORAGE_PREFIX = "hina-objective-draft-v1";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ObjectiveDraft {
  skill: ObjectivePracticeSkill;
  answers: Record<string, string>;
  sectionIndex: number;
  remainingSeconds: number;
  startedAt: number;
  updatedAt: number;
  playedSectionIds: string[];
}

export function objectiveDraftStorageKey(ownerId: string, skill: ObjectivePracticeSkill) {
  return `${STORAGE_PREFIX}:${ownerId || "guest"}:${skill}`;
}

export function loadObjectiveDraft(storage: StorageLike | null, ownerId: string, skill: ObjectivePracticeSkill): ObjectiveDraft | null {
  if (!storage) return null;
  try {
    const value = JSON.parse(storage.getItem(objectiveDraftStorageKey(ownerId, skill)) || "null") as Partial<ObjectiveDraft> | null;
    if (!value || value.skill !== skill || !value.answers || typeof value.answers !== "object") return null;
    if (![value.sectionIndex, value.remainingSeconds, value.startedAt, value.updatedAt].every((item) => typeof item === "number" && Number.isFinite(item))) return null;
    return {
      skill,
      answers: Object.fromEntries(Object.entries(value.answers).filter((entry): entry is [string, string] => typeof entry[1] === "string")),
      sectionIndex: Math.max(0, Math.floor(value.sectionIndex!)),
      remainingSeconds: Math.max(0, Math.floor(value.remainingSeconds!)),
      startedAt: value.startedAt!,
      updatedAt: value.updatedAt!,
      playedSectionIds: Array.isArray(value.playedSectionIds) ? value.playedSectionIds.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return null;
  }
}

export function saveObjectiveDraft(storage: StorageLike | null, ownerId: string, draft: ObjectiveDraft) {
  storage?.setItem(objectiveDraftStorageKey(ownerId, draft.skill), JSON.stringify(draft));
}

export function clearObjectiveDraft(storage: StorageLike | null, ownerId: string, skill: ObjectivePracticeSkill) {
  storage?.removeItem(objectiveDraftStorageKey(ownerId, skill));
}


