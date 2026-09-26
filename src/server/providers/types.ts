import type { LanguageTip } from "../../shared/languageTips.js";
import type { WishlistSuggestion } from "../../shared/types.js";
import type { ProactivePromptInput } from "../proactive.js";
import type { SpeakingEvaluation, SpeakingEvaluationInput, WritingEvaluation, WritingEvaluationInput } from "../../shared/practiceTypes.js";

export type ChatRole = "user" | "model";

export interface ChatMessageInput {
  role: ChatRole;
  text: string;
}

export interface LanguagePartnerResponse {
  response: string;
  tips: LanguageTip[];
  wishlistSuggestion?: WishlistSuggestion;
}

export interface MomentPromptInput {
  localDate: string;
  occasion?: string | null;
}

export interface MomentDraft {
  body: string;
  occasion?: string | null;
}

export interface SpeechResponse {
  audio: string;
  mimeType: string;
}

export interface LanguagePartnerProvider {
  chat(messages: ChatMessageInput[]): Promise<LanguagePartnerResponse>;
  draftProactiveOpener(input: ProactivePromptInput): Promise<LanguagePartnerResponse>;
  draftMoment(input: MomentPromptInput): Promise<MomentDraft>;
  evaluateSpeaking?(input: SpeakingEvaluationInput): Promise<SpeakingEvaluation>;
  evaluateWriting?(input: WritingEvaluationInput): Promise<WritingEvaluation>;
}

export interface SpeechProvider {
  speak(text: string): Promise<SpeechResponse | null>;
}
