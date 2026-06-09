import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ChatMessage } from "./ChatMessage.js";

const baseMessage = {
  id: "m1",
  role: "model" as const,
  text: "Omg, tiny Sherlock mode activated!",
  timestamp: Date.now(),
  type: "response" as const,
};

test("Hina response avatar follows light and dark theme", () => {
  const lightMarkup = renderToStaticMarkup(React.createElement(ChatMessage, {
    message: baseMessage,
    theme: "light",
  }));
  const darkMarkup = renderToStaticMarkup(React.createElement(ChatMessage, {
    message: baseMessage,
    theme: "dark",
  }));

  assert.match(lightMarkup, /data-hina-avatar="sun"/);
  assert.match(darkMarkup, /data-hina-avatar="moon"/);
});

test("tip avatars stay semantic instead of following theme", () => {
  const correctionMarkup = renderToStaticMarkup(React.createElement(ChatMessage, {
    message: { ...baseMessage, type: "tip" as const, tipKind: "correction" as const },
    theme: "dark",
  }));
  const expressionMarkup = renderToStaticMarkup(React.createElement(ChatMessage, {
    message: { ...baseMessage, type: "tip" as const, tipKind: "expression" as const },
    theme: "dark",
  }));

  assert.match(correctionMarkup, /data-hina-avatar="correction"/);
  assert.match(expressionMarkup, /data-hina-avatar="expression"/);
});
