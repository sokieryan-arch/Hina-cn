import type { LanguageTipType } from "./languageTips.js";

export type Role = "user" | "model";
export type MessageType = "response" | "tip" | "proactive";

export interface Message {
  id: string;
  role: Role;
  text: string;
  type?: MessageType;
  tipKind?: LanguageTipType;
  timestamp: number;
  isTyping?: boolean;
}

export interface ProactiveSettings {
  enabled: boolean;
  minHoursBetweenNudges: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  favoriteTopics: string[];
}

export interface CurrentUser {
  id: string;
  displayName: string;
  avatarUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  hasPassword: boolean;
  hasWeChat: boolean;
}
