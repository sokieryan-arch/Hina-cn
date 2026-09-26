import type { PracticeHistoryRecord, PracticeSkill } from "../shared/practiceTypes.js";

const SKILLS = new Set<PracticeSkill>(["listening", "reading", "writing", "speaking"]);

export function readPracticeSkill(value: unknown): PracticeSkill | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" || !SKILLS.has(value as PracticeSkill)) throw Object.assign(new Error("invalid_practice_skill"), { statusCode: 400 });
  return value as PracticeSkill;
}

export function readPracticeHistoryRecord(value: unknown): PracticeHistoryRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw Object.assign(new Error("invalid_practice_record"), { statusCode: 400 });
  const record = value as PracticeHistoryRecord;
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(String(record.id ?? ""))) throw Object.assign(new Error("invalid_practice_id"), { statusCode: 400 });
  if (!SKILLS.has(record.skill)) throw Object.assign(new Error("invalid_practice_skill"), { statusCode: 400 });
  if (!record.attempt || record.attempt.id !== record.id || record.attempt.createdAt !== record.createdAt) throw Object.assign(new Error("invalid_practice_record"), { statusCode: 400 });
  if (!Number.isFinite(record.createdAt) || !Number.isFinite(record.attempt.estimatedBand) || record.attempt.estimatedBand < 0 || record.attempt.estimatedBand > 9) throw Object.assign(new Error("invalid_practice_score"), { statusCode: 400 });
  if (JSON.stringify(record).length > 250_000) throw Object.assign(new Error("practice_record_too_large"), { statusCode: 400 });
  return record;
}
