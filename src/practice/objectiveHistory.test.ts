import assert from "node:assert/strict";
import test from "node:test";
import { loadObjectiveAttempts, MAX_OBJECTIVE_ATTEMPTS, objectiveAttemptsForSkill, objectiveHistoryStorageKey, saveObjectiveAttempts } from "./objectiveHistory";
import type { ObjectiveAttempt } from "../shared/practiceTypes";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

function attempt(index: number, skill: "reading" | "listening" = "reading"): ObjectiveAttempt {
  return { id: `${skill}-${index}`, skill, createdAt: index, correct: 20, total: 40, estimatedBand: 5.5, durationSeconds: 60, sectionScores: [], answers: {}, wrongQuestionIds: [] };
}

test("objective history is account scoped and capped", () => {
  const storage = new MemoryStorage();
  saveObjectiveAttempts(storage, "alice", Array.from({ length: 20 }, (_, index) => attempt(index)));
  assert.equal(loadObjectiveAttempts(storage, "alice").length, MAX_OBJECTIVE_ATTEMPTS);
  assert.equal(loadObjectiveAttempts(storage, "bob").length, 0);
  assert.notEqual(objectiveHistoryStorageKey("alice"), objectiveHistoryStorageKey("bob"));
});

test("objective attempts can be filtered by skill", () => {
  const attempts = [attempt(1), attempt(2, "listening")];
  assert.deepEqual(objectiveAttemptsForSkill(attempts, "listening").map((item) => item.id), ["listening-2"]);
});


