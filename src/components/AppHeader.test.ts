import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppHeader } from "./AppHeader.js";

function render(view: "chat" | "moments", theme: "light" | "dark" = "light") {
  return renderToStaticMarkup(React.createElement(AppHeader, {
    view,
    theme,
    presence: "reading",
    isSpeaking: false,
    onOpenSpace: () => {},
    onBack: () => {},
    onOpenSettings: () => {},
  }));
}

test("chat header keeps only Hina presence and settings controls", () => {
  const markup = render("chat");
  assert.match(markup, /Hina/);
  assert.match(markup, /📚 Reading/);
  assert.match(markup, /Settings/);
  assert.doesNotMatch(markup, /Logout|Toggle theme/);
});

test("space child header has the exact requested title and a back button", () => {
  const markup = render("moments");
  assert.match(markup, /📸 Hina&#x27;s Moments/);
  assert.match(markup, /Back/);
  assert.match(markup, /Settings/);
});

test("Hina avatar follows light and dark themes", () => {
  assert.match(render("chat", "light"), /data-hina-avatar="sun"/);
  assert.match(render("chat", "dark"), /data-hina-avatar="moon"/);
});
