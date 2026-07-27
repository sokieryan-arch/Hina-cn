import { randomUUID } from "node:crypto";
import type { SpeechProvider, SpeechResponse } from "./types.js";

interface VolcengineTtsProviderOptions {
  apiKey?: string;
  appId?: string;
  accessToken?: string;
  endpoint?: string;
  resourceId?: string;
  cluster?: string;
  voiceType?: string;
  encoding?: string;
  sampleRate?: number;
  speedRatio?: number;
  model?: string;
  fetchImpl?: typeof fetch;
}

const DEFAULT_V3_ENDPOINT = "https://openspeech.bytedance.com/api/v3/tts/unidirectional";
const DEFAULT_V1_ENDPOINT = "https://openspeech.bytedance.com/api/v1/tts";
const DEFAULT_RESOURCE_ID = "seed-tts-2.0";
const DEFAULT_VOICE_TYPE = "zh_female_vv_uranus_bigtts";
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

function parsePayloadLines(body: string) {
  return body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((payload): payload is Record<string, unknown> => payload !== null);
}

export class VolcengineTtsProvider implements SpeechProvider {
  private readonly apiKey: string;
  private readonly appId: string;
  private readonly accessToken: string;
  private readonly endpoint: string;
  private readonly resourceId: string;
  private readonly cluster: string;
  private readonly voiceType: string;
  private readonly encoding: string;
  private readonly sampleRate: number;
  private readonly speedRatio: number;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: VolcengineTtsProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.VOLCENGINE_TTS_API_KEY ?? "";
    this.appId = options.appId ?? process.env.VOLCENGINE_TTS_APP_ID ?? "";
    this.accessToken = options.accessToken ?? process.env.VOLCENGINE_TTS_ACCESS_TOKEN ?? "";

    const configuredEndpoint = options.endpoint ?? process.env.VOLCENGINE_TTS_ENDPOINT;
    const legacyEndpointConfiguredForV3 = Boolean(
      this.apiKey && configuredEndpoint?.includes("/api/v1/tts"),
    );
    this.endpoint = legacyEndpointConfiguredForV3
      ? DEFAULT_V3_ENDPOINT
      : configuredEndpoint ?? (this.apiKey ? DEFAULT_V3_ENDPOINT : DEFAULT_V1_ENDPOINT);

    this.resourceId = options.resourceId
      ?? process.env.VOLCENGINE_TTS_RESOURCE_ID
      ?? DEFAULT_RESOURCE_ID;
    this.cluster = options.cluster ?? process.env.VOLCENGINE_TTS_CLUSTER ?? "volcano_tts";
    this.voiceType = options.voiceType
      ?? process.env.VOLCENGINE_TTS_VOICE_TYPE
      ?? DEFAULT_VOICE_TYPE;
    this.encoding = options.encoding ?? process.env.VOLCENGINE_TTS_ENCODING ?? "mp3";
    this.sampleRate = options.sampleRate
      ?? Number(process.env.VOLCENGINE_TTS_SAMPLE_RATE || 24000);
    this.speedRatio = options.speedRatio
      ?? Number(process.env.VOLCENGINE_TTS_SPEED_RATIO || 1);
    this.model = options.model
      ?? process.env.VOLCENGINE_TTS_MODEL
      ?? (this.apiKey ? "" : "seed-tts-1.1");
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  isConfigured() {
    const hasV3Credentials = Boolean(this.apiKey && this.resourceId);
    const hasV1Credentials = Boolean(this.appId && this.accessToken);
    return Boolean(this.voiceType && (hasV3Credentials || hasV1Credentials));
  }

  async speak(text: string): Promise<SpeechResponse | null> {
    if (!this.isConfigured()) return null;
    if (this.apiKey) return this.speakV3(text);
    return this.speakV1(text);
  }

  private async speakV3(text: string): Promise<SpeechResponse> {
    const requestId = randomUUID();
    const speechRate = Number.isFinite(this.speedRatio)
      ? Math.max(-50, Math.min(100, Math.round((this.speedRatio - 1) * 100)))
      : 0;
    const audioParams: Record<string, unknown> = {
      format: this.encoding,
      sample_rate: Number.isFinite(this.sampleRate) ? this.sampleRate : 24000,
    };
    if (speechRate !== 0) audioParams.speech_rate = speechRate;

    const reqParams: Record<string, unknown> = {
      text: truncateUtf8(text.trim()),
      speaker: this.voiceType,
      audio_params: audioParams,
    };
    if (this.model && this.model !== "seed-tts-1.1") {
      reqParams.model = this.model;
    }

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": this.apiKey,
        "X-Api-Resource-Id": this.resourceId,
        "X-Api-Request-Id": requestId,
      },
      body: JSON.stringify({ req_params: reqParams }),
    });

    const body = await response.text();
    const payloads = parsePayloadLines(body);
    const lastCode = payloads
      .map((payload) => payload.code)
      .filter((code) => code !== undefined)
      .at(-1);
    const audioChunks = payloads
      .map((payload) => payload.data)
      .filter((data): data is string => typeof data === "string" && data.length > 0)
      .map((data) => Buffer.from(data, "base64"));

    if (!response.ok || audioChunks.length === 0) {
      throw new Error(
        `volcengine_tts_failed:${response.status}:${lastCode ?? "unknown"}`,
      );
    }

    return {
      audio: Buffer.concat(audioChunks).toString("base64"),
      mimeType: mimeTypeForEncoding(this.encoding),
    };
  }

  private async speakV1(text: string): Promise<SpeechResponse> {
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
          model: this.model || "seed-tts-1.1",
        },
      }),
    });

    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    const code = Number(payload.code);
    const audio = typeof payload.data === "string" ? payload.data : "";
    if (!response.ok || code !== 3000 || !audio) {
      throw new Error(
        `volcengine_tts_failed:${response.status}:${Number.isFinite(code) ? code : "unknown"}`,
      );
    }

    return {
      audio,
      mimeType: mimeTypeForEncoding(this.encoding),
    };
  }
}
