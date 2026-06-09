import test from "node:test";
import assert from "node:assert/strict";
import { VolcengineArkProvider } from "./arkProvider.js";

test("calls Ark chat completions and parses Hina JSON with exactly two tips", async () => {
  const requests: RequestInit[] = [];
  const provider = new VolcengineArkProvider({
    apiKey: "ark-test-key",
    baseUrl: "https://ark.example.test/api/v3",
    chatModel: "doubao-test",
    fetchImpl: async (_url, init) => {
      requests.push(init ?? {});
      return new Response(JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                response: "That subway lizard has main-character energy.",
                tips: [
                  { type: "correction", title: "Tiny fix", body: "Use went for past time." },
                  { type: "expression", title: "Phrase", body: "Main-character energy means confident presence." },
                ],
              }),
            },
          },
        ],
      }));
    },
  });

  const result = await provider.chat([{ role: "user", text: "I go to school yesterday" }]);

  assert.equal(result.response, "That subway lizard has main-character energy.");
  assert.equal(result.tips.length, 2);
  assert.equal(requests.length, 1);
  assert.match(String(requests[0].headers), /Bearer ark-test-key/);
});

test("falls back to safe tips when Ark returns invalid JSON", async () => {
  const provider = new VolcengineArkProvider({
    apiKey: "ark-test-key",
    baseUrl: "https://ark.example.test/api/v3",
    chatModel: "doubao-test",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: "Oops, not JSON" } }],
    })),
  });

  const result = await provider.chat([{ role: "user", text: "hello" }]);

  assert.match(result.response, /Oops/);
  assert.equal(result.tips.length, 2);
  assert.deepEqual(result.tips.map((tip) => tip.type), ["correction", "expression"]);
});
