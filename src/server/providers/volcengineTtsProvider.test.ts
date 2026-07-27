import test from "node:test";
import assert from "node:assert/strict";
import { VolcengineTtsProvider } from "./volcengineTtsProvider.js";

test("returns null when Volcengine TTS credentials are missing", async () => {
  const provider = new VolcengineTtsProvider({
    appId: "",
    accessToken: "",
  });

  assert.equal(await provider.speak("Hello, Hina."), null);
});

test("calls Volcengine TTS and normalizes its Base64 audio response", async () => {
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
        reqid: "request-id",
        code: 3000,
        message: "Success",
        sequence: -1,
        data: "base64-audio",
      }));
    },
  });

  const result = await provider.speak("Hey, I found the tiniest coffee shop today.");
  const body = JSON.parse(String(requestInit?.body));

  assert.equal(requestUrl, "https://openspeech.bytedance.com/api/v1/tts");
  assert.match(String(requestInit?.headers), /Bearer; speech-access-token/);
  assert.equal(body.app.appid, "speech-app-id");
  assert.equal(body.audio.voice_type, "en_female_amanda_mars_bigtts");
  assert.equal(body.audio.encoding, "mp3");
  assert.equal(body.request.operation, "query");
  assert.equal(body.request.model, "seed-tts-1.1");
  assert.equal(result?.audio, "base64-audio");
  assert.equal(result?.mimeType, "audio/mpeg");
});

test("keeps TTS text within the API UTF-8 byte limit", async () => {
  let requestBody: any;
  const provider = new VolcengineTtsProvider({
    appId: "speech-app-id",
    accessToken: "speech-access-token",
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ code: 3000, data: "audio" }));
    },
  });

  await provider.speak("你".repeat(500));

  assert.ok(Buffer.byteLength(requestBody.request.text, "utf8") <= 1000);
  assert.ok(requestBody.request.text.length > 0);
});

test("rejects unsuccessful TTS responses without exposing provider messages", async () => {
  const provider = new VolcengineTtsProvider({
    appId: "speech-app-id",
    accessToken: "speech-access-token",
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
