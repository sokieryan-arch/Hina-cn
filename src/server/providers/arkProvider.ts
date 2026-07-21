import { HINA_MOMENT_INSTRUCTION, HINA_SYSTEM_INSTRUCTION } from "../hinaPrompt.js";
import { buildProactivePrompt } from "../proactive.js";
import { normalizeLanguageTips } from "../../shared/languageTips.js";
import { normalizeWishlistSuggestion } from "../space.js";
import type {
  ChatMessageInput,
  LanguagePartnerProvider,
  LanguagePartnerResponse,
  SpeechProvider,
  SpeechResponse,
} from "./types.js";

interface ArkProviderOptions {
  apiKey?: string;
  baseUrl?: string;
  chatModel?: string;
  ttsEndpoint?: string;
  fetchImpl?: typeof fetch;
}

function extractText(payload: unknown): string {
  const data = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const choices = Array.isArray(data.choices) ? data.choices : [];
  const firstChoice = choices[0] && typeof choices[0] === "object" ? choices[0] as Record<string, unknown> : {};
  const message = firstChoice.message && typeof firstChoice.message === "object"
    ? firstChoice.message as Record<string, unknown>
    : {};
  return typeof message.content === "string" ? message.content.trim() : "";
}

function parseHinaResponse(text: string): LanguagePartnerResponse {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    return {
      response: typeof parsed.response === "string" && parsed.response.trim()
        ? parsed.response.trim()
        : text,
      tips: normalizeLanguageTips(parsed.tips),
      wishlistSuggestion: normalizeWishlistSuggestion(parsed.wishlistSuggestion),
    };
  } catch {
    return {
      response: text || "I hit a snag on my side. Try me again in a moment?",
      tips: normalizeLanguageTips(undefined),
    };
  }
}

export class VolcengineArkProvider implements LanguagePartnerProvider, SpeechProvider {
  private readonly apiKey?: string;
  private readonly baseUrl: string;
  private readonly chatModel: string;
  private readonly ttsEndpoint?: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ArkProviderOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.ARK_API_KEY;
    this.baseUrl = (options.baseUrl ?? process.env.ARK_BASE_URL ?? "https://ark.cn-beijing.volces.com/api/v3").replace(/\/$/, "");
    this.chatModel = options.chatModel ?? process.env.ARK_CHAT_MODEL ?? "";
    this.ttsEndpoint = options.ttsEndpoint ?? process.env.ARK_TTS_ENDPOINT;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse> {
    if (!this.apiKey) throw new Error("missing_ark_api_key");
    if (!this.chatModel) throw new Error("missing_ark_chat_model");

    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: [
        ["Authorization", `Bearer ${this.apiKey}`],
        ["Content-Type", "application/json"],
      ],
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: "system", content: HINA_SYSTEM_INSTRUCTION },
          ...messages.map((message) => ({
            role: message.role === "model" ? "assistant" : "user",
            content: message.text,
          })),
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`ark_chat_failed:${response.status}`);
    }

    return parseHinaResponse(extractText(payload));
  }

  async draftProactiveOpener(input: Parameters<LanguagePartnerProvider["draftProactiveOpener"]>[0]) {
    return this.chat([{ role: "user", text: buildProactivePrompt(input) }]);
  }

  async draftMoment(input: Parameters<LanguagePartnerProvider["draftMoment"]>[0]) {
    if (!this.apiKey) throw new Error("missing_ark_api_key");
    if (!this.chatModel) throw new Error("missing_ark_chat_model");
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: [
        ["Authorization", `Bearer ${this.apiKey}`],
        ["Content-Type", "application/json"],
      ],
      body: JSON.stringify({
        model: this.chatModel,
        messages: [
          { role: "system", content: HINA_MOMENT_INSTRUCTION },
          {
            role: "user",
            content: `New York local date: ${input.localDate}\nOccasion: ${input.occasion ?? "none"}`,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.9,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`ark_moment_failed:${response.status}`);
    const parsed = JSON.parse(extractText(payload)) as Record<string, unknown>;
    const body = typeof parsed.body === "string" ? parsed.body.trim() : "";
    if (!body) throw new Error("ark_moment_empty");
    return {
      body,
      occasion: typeof parsed.occasion === "string" ? parsed.occasion : input.occasion ?? null,
    };
  }

  async speak(text: string): Promise<SpeechResponse | null> {
    if (!this.apiKey || !this.ttsEndpoint) return null;

    const response = await this.fetchImpl(this.ttsEndpoint, {
      method: "POST",
      headers: [
        ["Authorization", `Bearer ${this.apiKey}`],
        ["Content-Type", "application/json"],
      ],
      body: JSON.stringify({ text }),
    });

    if (!response.ok) throw new Error(`ark_tts_failed:${response.status}`);
    const payload = await response.json() as Record<string, unknown>;
    const audio = typeof payload.audio === "string" ? payload.audio : "";
    if (!audio) return null;
    return {
      audio,
      mimeType: typeof payload.mimeType === "string" ? payload.mimeType : "audio/mpeg",
    };
  }
}
