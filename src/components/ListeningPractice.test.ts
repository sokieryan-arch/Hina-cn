import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ListeningPractice } from "./ListeningPractice";

test("listening practice explains one-play audio and hidden transcripts", () => {
  const markup = renderToStaticMarkup(React.createElement(ListeningPractice, { ownerId: "preview", onExit: () => {}, onSaveStudyCards: () => {} }));
  assert.match(markup, /IELTS Listening/);
  assert.match(markup, /4<\/strong><span[^>]*>sections/);
  assert.match(markup, /40<\/strong><span[^>]*>questions/);
  assert.match(markup, /plays once/);
  assert.match(markup, /transcript stays hidden/);
});


