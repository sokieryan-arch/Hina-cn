import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeProgress } from "./PracticeProgress";

test("practice progress renders the four-skill baseline and next action", () => {
  const markup = renderToStaticMarkup(React.createElement(PracticeProgress, { records: [], syncStatus: "local", onExit: () => {}, onStartSkill: () => {} }));
  assert.match(markup, /Four-skill picture/);
  assert.match(markup, /Listening/);
  assert.match(markup, /Reading/);
  assert.match(markup, /Writing/);
  assert.match(markup, /Speaking/);
  assert.match(markup, /Next practice/);
});


