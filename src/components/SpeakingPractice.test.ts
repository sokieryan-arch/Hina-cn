import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SpeakingPractice } from "./SpeakingPractice";

test("speaking practice renders all three IELTS parts and the score disclaimer", () => {
  const markup = renderToStaticMarkup(React.createElement(SpeakingPractice, {
    ownerId: "test-user",
    nativeLanguage: "zh-CN",
    onEvaluate: async () => { throw new Error("not called during render"); },
    onSaveStudyCards: () => {},
  }));

  assert.match(markup, /IELTS Speaking/);
  assert.match(markup, /Part 1/);
  assert.match(markup, /Part 2/);
  assert.match(markup, /Part 3/);
  assert.match(markup, /not an official IELTS score/);
});


