import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadingPractice } from "./ReadingPractice";

test("reading practice introduces the complete test and evidence review", () => {
  const markup = renderToStaticMarkup(React.createElement(ReadingPractice, { ownerId: "preview", onExit: () => {}, onSaveStudyCards: () => {} }));
  assert.match(markup, /IELTS Academic Reading/);
  assert.match(markup, /3<\/strong><span[^>]*>passages/);
  assert.match(markup, /40<\/strong><span[^>]*>questions/);
  assert.match(markup, /60<\/strong><span[^>]*>minutes/);
  assert.match(markup, /exact sentence/);
});


