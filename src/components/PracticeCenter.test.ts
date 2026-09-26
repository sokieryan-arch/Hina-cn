import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PracticeCenter } from "./PracticeCenter";

test("practice center offers all four IELTS skills", () => {
  const markup = renderToStaticMarkup(React.createElement(PracticeCenter, {
    ownerId: "preview",
    nativeLanguage: "zh-CN",
    onEvaluateSpeaking: async () => { throw new Error("not used"); },
    onSaveSpeakingStudyCards: () => {},
    onEvaluateWriting: async () => { throw new Error("not used"); },
    onSaveWritingStudyCards: () => {},
    onSaveObjectiveStudyCards: () => {},
  }));
  assert.match(markup, /Listening/);
  assert.match(markup, /Academic Reading/);
  assert.match(markup, /Speaking/);
  assert.match(markup, />Writing</);
  assert.match(markup, /Task 1 visuals/);
  assert.match(markup, /Task 2 argument/);
  assert.match(markup, /Progress &amp; next practice/);
});


