import type { LanguageTipType } from "../../shared/languageTips.js";
import type { ProactiveSettings } from "../proactive.js";
import type { AuthStores } from "../auth/types.js";

export interface MessageRecord {
  id: string;
  userId: string;
  role: "user" | "model";
  text: string;
  type: "response" | "tip" | "proactive";
  tipKind?: LanguageTipType | null;
  createdAt: Date;
}

export interface CreateMessageInput {
  id?: string;
  userId: string;
  role: "user" | "model";
  text: string;
  type?: "response" | "tip" | "proactive";
  tipKind?: LanguageTipType | null;
}

export interface ProactiveSettingsRecord extends ProactiveSettings {
  lastNudgeAt?: Date | null;
}

export interface MessageStore {
  listMessages(userId: string): Promise<MessageRecord[]>;
  addMessage(input: CreateMessageInput): Promise<MessageRecord>;
  clearMessages(userId: string): Promise<void>;
}

export interface ProactiveSettingsStore {
  getProactiveSettings(userId: string): Promise<ProactiveSettingsRecord>;
  saveProactiveSettings(userId: string, settings: ProactiveSettings): Promise<ProactiveSettingsRecord>;
  markProactiveNudge(userId: string, at: Date): Promise<void>;
}

export interface AppStore {
  auth: AuthStores;
  messages: MessageStore;
  proactive: ProactiveSettingsStore;
}
