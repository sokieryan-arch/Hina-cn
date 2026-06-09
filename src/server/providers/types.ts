import type { LanguageTip } from "../../shared/languageTips.js";
import type { ProactivePromptInput } from "../proactive.js";

export type ChatRole = "user" | "model";

export interface ChatMessageInput {
  role: ChatRole;
  text: string;
}

export interface LanguagePartnerResponse {
  response: string;
  tips: LanguageTip[];
}

export interface SpeechResponse {
  audio: string;
  mimeType: string;
}

export interface LanguagePartnerProvider {
  chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse>;
  draftProactiveOpener(input: ProactivePromptInput): Promise<LanguagePartnerResponse>;
}

export interface SpeechProvider {
  speak(text: string): Promise<SpeechResponse | null>;
}
