import type {
  ObjectiveAttempt,
  PracticeHistoryRecord,
  PracticeSkill,
  SpeakingAttempt,
  WritingAttempt,
} from "../shared/practiceTypes";
import { loadObjectiveAttempts, saveObjectiveAttempts } from "./objectiveHistory";
import { loadSpeakingAttempts, saveSpeakingAttempts } from "./speakingHistory";
import { loadWritingAttempts, saveWritingAttempts } from "./writingHistory";

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function recordKey(record: Pick<PracticeHistoryRecord, "skill" | "id">) {
  return `${record.skill}:${record.id}`;
}

export function practiceRecord(skill: PracticeSkill, attempt: PracticeHistoryRecord["attempt"]): PracticeHistoryRecord {
  return { id: attempt.id, skill, createdAt: attempt.createdAt, attempt };
}

export function loadLocalPracticeRecords(storage: StorageLike | null, ownerId: string): PracticeHistoryRecord[] {
  return [
    ...loadObjectiveAttempts(storage, ownerId).map((attempt) => practiceRecord(attempt.skill, attempt)),
    ...loadWritingAttempts(storage, ownerId).map((attempt) => practiceRecord("writing", attempt)),
    ...loadSpeakingAttempts(storage, ownerId).map((attempt) => practiceRecord("speaking", attempt)),
  ].sort((left, right) => right.createdAt - left.createdAt);
}

export function mergePracticeRecords(...groups: PracticeHistoryRecord[][]) {
  const records = new Map<string, PracticeHistoryRecord>();
  for (const group of groups) {
    for (const record of group) {
      const key = recordKey(record);
      const current = records.get(key);
      if (!current || record.createdAt >= current.createdAt) records.set(key, record);
    }
  }
  return Array.from(records.values()).sort((left, right) => right.createdAt - left.createdAt);
}

export function applyPracticeRecordsToLocal(storage: StorageLike | null, ownerId: string, records: PracticeHistoryRecord[]) {
  if (!storage) return;
  const objective = records
    .filter((record) => record.skill === "reading" || record.skill === "listening")
    .map((record) => record.attempt as ObjectiveAttempt);
  const writing = records.filter((record) => record.skill === "writing").map((record) => record.attempt as WritingAttempt);
  const speaking = records.filter((record) => record.skill === "speaking").map((record) => record.attempt as SpeakingAttempt);
  saveObjectiveAttempts(storage, ownerId, objective);
  saveWritingAttempts(storage, ownerId, writing);
  saveSpeakingAttempts(storage, ownerId, speaking);
}

export function recordsMissingFromCloud(local: PracticeHistoryRecord[], cloud: PracticeHistoryRecord[]) {
  const cloudKeys = new Set(cloud.map(recordKey));
  return local.filter((record) => !cloudKeys.has(recordKey(record)));
}


