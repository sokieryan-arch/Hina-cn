import assert from "node:assert/strict";
import test from "node:test";
import type { PracticeHistoryRecord } from "../shared/practiceTypes";
import { applyPracticeRecordsToLocal, loadLocalPracticeRecords, mergePracticeRecords, recordsMissingFromCloud } from "./practiceHistorySync";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function record(id: string, createdAt: number): PracticeHistoryRecord {
  return { id, skill: "reading", createdAt, attempt: { id, skill: "reading", createdAt, correct: 20, total: 40, estimatedBand: 5.5, durationSeconds: 10, sectionScores: [7, 7, 6], answers: {}, wrongQuestionIds: [] } };
}

test("local practice records round-trip through existing skill stores", () => {
  const storage = new MemoryStorage();
  applyPracticeRecordsToLocal(storage, "user", [record("r1", 100)]);
  assert.deepEqual(loadLocalPracticeRecords(storage, "user"), [record("r1", 100)]);
});

test("merge deduplicates records and identifies local-only attempts", () => {
  const local = [record("r1", 100), record("r2", 200)];
  const cloud = [record("r1", 100)];
  assert.deepEqual(mergePracticeRecords(local, cloud).map((item) => item.id), ["r2", "r1"]);
  assert.deepEqual(recordsMissingFromCloud(local, cloud).map((item) => item.id), ["r2"]);
});


