import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { WritingPractice } from "./WritingPractice";

test("writing practice offers Academic Task 1 and Task 2 workspaces", () => {
  const markup = renderToStaticMarkup(React.createElement(WritingPractice, {
    ownerId: "preview",
    nativeLanguage: "zh-CN",
    onExit: () => {},
    onEvaluate: async () => { throw new Error("not used"); },
    onSaveStudyCards: () => {},
  }));
  assert.match(markup, /Academic Task 1/);
  assert.match(markup, /Task 2/);
  assert.match(markup, /Charts, tables, maps, and processes/);
  assert.match(markup, /not an official IELTS score/);
});


