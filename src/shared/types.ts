import type { LanguageTipType, StudyCategory } from "./languageTips.js";

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
  createdAt: string;
}

export interface BillingSummary {
  plan: "free" | "pro";
  isPro: boolean;
  dailyLimit: number | null;
  usedToday: number;
  remainingToday: number | null;
  resetAt: string;
}

export interface HinaMoment {
  id: string;
  body: string;
  occasion?: string | null;
  publishedAt: string;
}

export interface StudyNote {
  id: string;
  category: StudyCategory;
  title: string;
  body: string;
  example?: string | null;
  original?: string | null;
  suggestion?: string | null;
  createdAt: string;
}

export type WishlistKind = "goal" | "hook" | "place" | "note";

export interface WishlistItem {
  id: string;
  kind: WishlistKind;
  title: string;
  details?: string | null;
  targetDate?: string | null;
  progress: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistSuggestion {
  kind: WishlistKind;
  title: string;
  details?: string;
}

export interface TimeCapsule {
  id: string;
  title: string;
  body?: string | null;
  unlockAt: string;
  openedAt?: string | null;
  isUnlocked: boolean;
  isOpened: boolean;
  createdAt: string;
}

export interface RelationshipMilestone {
  label: string;
  reached: boolean;
  value: number;
}

export interface RelationshipSummary {
  knownDays: number;
  messages: number;
  sharedMemories: number;
  currentStreak: number;
  notesCount: number;
  completedGoals: number;
  milestones: RelationshipMilestone[];
  nextHundredDayAt: string;
  nextHoliday: { name: string; date: string };
}
