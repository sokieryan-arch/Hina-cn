import assert from "node:assert/strict";
import test from "node:test";
import { findWritingPrompt, findWritingTask2Prompt, WRITING_TASK_1_PROMPTS, WRITING_TASK_2_PROMPTS } from "./writingPrompts";

test("writing practice ships original Academic Task 1 prompts across visual types", () => {
  assert.equal(WRITING_TASK_1_PROMPTS.length, 6);
  assert.deepEqual(new Set(WRITING_TASK_1_PROMPTS.map((prompt) => prompt.visual.kind)), new Set(["line", "bar", "pie", "table", "map", "process"]));
  assert.ok(WRITING_TASK_1_PROMPTS.every((prompt) => prompt.minimumWords === 150 && prompt.durationMinutes === 20));
  assert.equal(findWritingPrompt("task1-museum-visitors")?.taskType, "task1");
});

test("writing practice ships original Task 2 prompts across common topics", () => {
  assert.equal(WRITING_TASK_2_PROMPTS.length, 6);
  assert.equal(new Set(WRITING_TASK_2_PROMPTS.map((prompt) => prompt.topic)).size, 6);
  assert.match(findWritingTask2Prompt("task2-remote-work")?.question || "", /advantages/i);
  assert.equal(findWritingPrompt("task2-remote-work")?.taskType, "task2");
  assert.equal(findWritingTask2Prompt("unknown"), null);
});


