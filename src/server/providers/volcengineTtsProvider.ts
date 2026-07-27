import { randomUUID } from "node:crypto";
import type { SpeechProvider, SpeechResponse } from "./types.js";

interface VolcengineTtsProviderOptions {
  appId?: string;
  accessToken?: string;
  endpoint?: string;
  cluster?: string;
  voiceType?: string;
  encoding?: string;
  speedRatio?: number;
  model?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts";
const DEFAULT_VOICE_TYPE = "en_female_amanda_mars_bigtts";
const MAX_TEXT_BYTES = 1000;

function truncateUtf8(text: string, maxBytes = MAX_TEXT_BYTES) {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;

  let result = "";
  let bytes = 0;
  for (const character of text) {
    const characterBytes = Buffer.byteLength(character, "utf8");
    if (bytes + characterBytes > maxBytes) break;
    result += character;
    bytes += characterBytes;
  }
  return result;
}

function mimeTypeForEncoding(encoding: string) {
  if (encoding === "wav") return "audio/wav";
  if (encoding === "ogg_opus") return "audio/ogg";
  if (encoding === "pcm") return "audio/pcm";
  return "audio/mpeg";
}

export class VolcengineTtsProvider implements SpeechProvider {
  private readonly appId: string;
  private readonly accessToken: string;
  private readonly endpoint: string;
  private readonly cluster: string;
  private readonly voiceType: string;
  private readonly encoding: string;
  private readonly speedRatio: number;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VolcengineTtsProviderOptions = {}) {
    this.appId = options.appId ?? process.env.VOLCENGINE_TTS_APP_ID ?? "";
    this.accessToken = options.accessToken ?? process.env.VOLCENGINE_TTS_ACCESS_TOKEN ?? "";
    this.endpoint = options.endpoint
      ?? process.env.VOLCENGINE_TTS_ENDPOINT
      ?? DEFAULT_ENDPOINT;
    this.cluster = options.cluster ?? process.env.VOLCENGINE_TTS_CLUSTER ?? "volcano_tts";
    this.voiceType = options.voiceType
      ?? process.env.VOLCENGINE_TTS_VOICE_TYPE
      ?? DEFAULT_VOICE_TYPE;
    this.encoding = options.encoding ?? process.env.VOLCENGINE_TTS_ENCODING ?? "mp3";
    this.speedRatio = options.speedRatio
      ?? Number(process.env.VOLCENGINE_TTS_SPEED_RATIO || 1);
    this.model = options.model ?? process.env.VOLCENGINE_TTS_MODEL ?? "seed-tts-1.1";
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isConfigured() {
    return Boolean(this.appId && this.accessToken && this.voiceType);
  }

  async speak(text: string): Promise<SpeechResponse | null> {
    if (!this.isConfigured()) return null;

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: [
        ["Authorization", `Bearer; ${this.accessToken}`],
        ["Content-Type", "application/json"],
      ],
      body: JSON.stringify({
        app: {
          appid: this.appId,
          token: this.accessToken,
          cluster: this.cluster,
        },
        user: {
          uid: "hina-cn",
        },
        audio: {
          voice_type: this.voiceType,
          encoding: this.encoding,
          speed_ratio: Number.isFinite(this.speedRatio) ? this.speedRatio : 1,
        },
        request: {
          reqid: randomUUID(),
          text: truncateUtf8(text.trim()),
          operation: "query",
          model: this.model,
        },
      }),
    });

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const code = Number(payload.code);
    const audio = typeof payload.data === "string" ? payload.data : "";
    if (!response.ok || code !== 3000 || !audio) {
      throw new Error(`volcengine_tts_failed:${response.status}:${Number.isFinite(code) ? code : "unknown"}`);
    }

    return {
      audio,
      mimeType: mimeTypeForEncoding(this.encoding),
    };
  }
}
