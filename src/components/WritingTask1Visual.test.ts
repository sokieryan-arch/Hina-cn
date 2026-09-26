import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WRITING_TASK_1_PROMPTS } from "../practice/writingPrompts";
import { WritingTask1Visual } from "./WritingTask1Visual";

test("every original Task 1 visual renders its title and data source note", () => {
  for (const prompt of WRITING_TASK_1_PROMPTS) {
    const markup = renderToStaticMarkup(React.createElement(WritingTask1Visual, { visual: prompt.visual }));
    assert.match(markup, new RegExp(prompt.visual.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(markup, /Original practice data/);
  }
});

test("Task 1 visuals expose chart, table, map and process labels in markup", () => {
  const markup = WRITING_TASK_1_PROMPTS.map((prompt) => renderToStaticMarkup(React.createElement(WritingTask1Visual, { visual: prompt.visual }))).join("\n");
  assert.match(markup, /Maritime/);
  assert.match(markup, /Housing/);
  assert.match(markup, /Riverside Park/);
  assert.match(markup, /Harvest/);
});


