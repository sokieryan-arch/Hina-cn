import assert from "node:assert/strict";
import test from "node:test";
import { clearObjectiveDraft, loadObjectiveDraft, saveObjectiveDraft } from "./objectiveDraft";

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}

test("objective drafts save, restore, and clear test progress", () => {
  const storage = new MemoryStorage();
  const draft = { skill: "listening" as const, answers: { q1: "answer" }, sectionIndex: 2, remainingSeconds: 900, startedAt: 10, updatedAt: 20, playedSectionIds: ["s1"] };
  saveObjectiveDraft(storage, "user", draft);
  assert.deepEqual(loadObjectiveDraft(storage, "user", "listening"), draft);
  clearObjectiveDraft(storage, "user", "listening");
  assert.equal(loadObjectiveDraft(storage, "user", "listening"), null);
});


