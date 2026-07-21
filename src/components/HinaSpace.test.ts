import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { HinaSpace } from "./HinaSpace.js";

test("Hina's Space home renders a stable four-cell navigation grid", () => {
  const markup = renderToStaticMarkup(React.createElement(HinaSpace, {
    view: "space",
    onNavigate: () => {},
  }));
  assert.match(markup, /data-space-grid="true"/);
  assert.match(markup, /Moments/);
  assert.match(markup, /Study/);
  assert.match(markup, /Wishlist/);
  assert.match(markup, /Relationship/);
});
