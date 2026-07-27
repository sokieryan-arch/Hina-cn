import test from "node:test";
import assert from "node:assert/strict";
import { VolcengineTtsProvider } from "./volcengineTtsProvider.js";

test("returns null when Volcengine TTS credentials are missing", async () => {
  const provider = new VolcengineTtsProvider({
    apiKey: "",
    appId: "",
    accessToken: "",
  });

  assert.equal(await provider.speak("Hello, Hina."), null);
});

test("calls Volcengine TTS 2.0 over V3 and combines NDJSON audio chunks", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const firstChunk = Buffer.from("first-audio-");
  const secondChunk = Buffer.from("second-audio");
  const provider = new VolcengineTtsProvider({
    apiKey: "speech-api-key",
    resourceId: "seed-tts-2.0",
    voiceType: "zh_female_vv_uranus_bigtts",
    fetchImpl: async (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      return new Response([
        JSON.stringify({ code: 0, data: firstChunk.toString("base64") }),
        JSON.stringify({ code: 0, data: secondChunk.toString("base64") }),
        JSON.stringify({ code: 20000000, message: "OK" }),
      ].join("\n"));
    },
  });

  const result = await provider.speak("Hey, I found the tiniest coffee shop today.");
  const headers = new Headers(requestInit?.headers);
  const body = JSON.parse(String(requestInit?.body));

  assert.equal(
    requestUrl,
    "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
  );
  assert.equal(headers.get("X-Api-Key"), "speech-api-key");
  assert.equal(headers.get("X-Api-Resource-Id"), "seed-tts-2.0");
  assert.ok(headers.get("X-Api-Request-Id"));
  assert.equal(body.req_params.speaker, "zh_female_vv_uranus_bigtts");
  assert.equal(body.req_params.audio_params.format, "mp3");
  assert.equal(body.req_params.audio_params.sample_rate, 24000);
  assert.equal(Buffer.from(result?.audio ?? "", "base64").toString(), "first-audio-second-audio");
  assert.equal(result?.mimeType, "audio/mpeg");
});

test("migrates a stale V1 endpoint to V3 when an API key is configured", async () => {
  let requestUrl = "";
  const provider = new VolcengineTtsProvider({
    apiKey: "speech-api-key",
    endpoint: "https://openspeech.bytedance.com/api/v1/tts",
    fetchImpl: async (url) => {
      requestUrl = String(url);
      return new Response(`${JSON.stringify({
        code: 0,
        data: Buffer.from("audio").toString("base64"),
      })}\n`);
    },
  });

  await provider.speak("Hello");
  assert.equal(
    requestUrl,
    "https://openspeech.bytedance.com/api/v3/tts/unidirectional",
  );
});

test("keeps V3 TTS text within the API UTF-8 byte limit", async () => {
  let requestBody: any;
  const provider = new VolcengineTtsProvider({
    apiKey: "speech-api-key",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(`${JSON.stringify({
        code: 0,
        data: Buffer.from("audio").toString("base64"),
      })}\n`);
    },
  });

  await provider.speak("你".repeat(500));

  assert.ok(Buffer.byteLength(requestBody.req_params.text, "utf8") <= 1000);
  assert.ok(requestBody.req_params.text.length > 0);
});

test("rejects unsuccessful V3 responses without exposing provider messages", async () => {
  const provider = new VolcengineTtsProvider({
    apiKey: "speech-api-key",
    fetchImpl: async () => new Response(JSON.stringify({
      code: 45000081,
      message: "secret diagnostic detail",
    }), { status: 400 }),
  });

  await assert.rejects(
    () => provider.speak("Hello"),
    /volcengine_tts_failed:400:45000081/,
  );
});

test("keeps the legacy V1 AppID and token integration as a fallback", async () => {
  let requestUrl = "";
  let requestInit: RequestInit | undefined;
  const provider = new VolcengineTtsProvider({
    appId: "speech-app-id",
    accessToken: "speech-access-token",
    voiceType: "en_female_amanda_mars_bigtts",
    fetchImpl: async (url, init) => {
      requestUrl = String(url);
      requestInit = init;
      return new Response(JSON.stringify({
        code: 3000,
        data: "base64-audio",
      }));
    },
  });

  const result = await provider.speak("Hello");
  const body = JSON.parse(String(requestInit?.body));

  assert.equal(requestUrl, "https://openspeech.bytedance.com/api/v1/tts");
  assert.match(String(requestInit?.headers), /Bearer; speech-access-token/);
  assert.equal(body.app.appid, "speech-app-id");
  assert.equal(body.request.model, "seed-tts-1.1");
  assert.equal(result?.audio, "base64-audio");
});
