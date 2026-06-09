import test from "node:test";
import assert from "node:assert/strict";
import { normalizeLanguageTips } from "./languageTips.js";

test("normalizes model tips to exactly two safe tips", () => {
  const tips = normalizeLanguageTips([
    {
      type: "correction",
      title: "Tiny grammar fix",
      body: "Say \"I went\" instead of \"I go\" when you mean yesterday.",
      original: "I go yesterday",
      suggestion: "I went yesterday",
    },
    {
      type: "expression",
      title: "Phrase to steal",
      body: "Side quest means an unexpected little adventure.",
      example: "My morning became a coffee side quest.",
    },
    {
      type: "culture",
      title: "Extra",
      body: "This third item should be dropped.",
    },
  ]);

  assert.equal(tips.length, 2);
  assert.equal(tips[0].type, "correction");
  assert.equal(tips[0].suggestion, "I went yesterday");
  assert.equal(tips[1].type, "expression");
});

test("fills invalid model tips with correction and expression fallbacks", () => {
  const tips = normalizeLanguageTips([{ type: "unknown", title: "", body: "" }]);

  assert.equal(tips.length, 2);
  assert.deepEqual(tips.map((tip) => tip.type), ["correction", "expression"]);
});

test("accepts Ark-style tip aliases with content fields", () => {
  const tips = normalizeLanguageTips([
    {
      type: "grammar correction",
      content: "Use past tense: I went to school yesterday and I was very tired.",
    },
    {
      type: "useful expression",
      content: "Try dead on my feet (累得都站不住了) for extreme tiredness.",
    },
  ]);

  assert.equal(tips.length, 2);
  assert.equal(tips[0].type, "correction");
  assert.equal(tips[0].title, "Grammar correction");
  assert.match(tips[0].body, /I went to school/);
  assert.equal(tips[1].type, "expression");
  assert.equal(tips[1].title, "Useful expression");
});

test("infers first and second tip types when Ark omits type fields", () => {
  const tips = normalizeLanguageTips([
    {
      content: "Use past tense: I went to school yesterday and I was very tired.",
    },
    {
      content: "Try I'm beat (累惨了) when you are extremely tired.",
    },
  ]);

  assert.equal(tips.length, 2);
  assert.equal(tips[0].type, "correction");
  assert.equal(tips[0].title, "Tiny grammar fix");
  assert.equal(tips[1].type, "expression");
  assert.equal(tips[1].title, "Useful expression");
});
