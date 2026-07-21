import type { LanguageTipType, StudyCategory } from "../../shared/languageTips.js";
import type { WishlistKind } from "../../shared/types.js";
import type { BillingPlan, BillingSummary } from "../billing.js";
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

export interface BillingStore {
  getBillingSummary(userId: string, now?: Date): Promise<BillingSummary>;
  incrementChatUsage(userId: string, now?: Date): Promise<BillingSummary>;
  setPlan(userId: string, plan: BillingPlan, proExpiresAt?: Date | null, now?: Date): Promise<BillingSummary>;
}

export interface HinaMomentRecord {
  id: string;
  body: string;
  occasion?: string | null;
  publishedAt: Date;
  nextDueAt: Date;
}

export interface StudyNoteRecord {
  id: string;
  userId: string;
  category: StudyCategory;
  title: string;
  body: string;
  example?: string | null;
  original?: string | null;
  suggestion?: string | null;
  sourceMessageId?: string | null;
  dedupeKey: string;
  createdAt: Date;
}

export interface WishlistItemRecord {
  id: string;
  userId: string;
  kind: WishlistKind;
  title: string;
  details?: string | null;
  targetDate?: string | null;
  progress: number;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeCapsuleRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  unlockAt: Date;
  openedAt?: Date | null;
  createdAt: Date;
}

export interface RelationshipCounts {
  messageCount: number;
  conversationDates: string[];
  notesCount: number;
  completedGoals: number;
}

export interface SpaceStore {
  listMoments(limit?: number): Promise<HinaMomentRecord[]>;
  latestMoment(): Promise<HinaMomentRecord | null>;
  addMomentIfDue(input: {
    body: string;
    occasion?: string | null;
    now: Date;
    nextDueAt: Date;
  }): Promise<HinaMomentRecord | null>;
  listNotes(userId: string, category?: StudyCategory): Promise<StudyNoteRecord[]>;
  saveNote(input: Omit<StudyNoteRecord, "id" | "createdAt">): Promise<StudyNoteRecord | null>;
  deleteNote(userId: string, noteId: string): Promise<boolean>;
  clearNotes(userId: string): Promise<void>;
  listWishlist(userId: string): Promise<WishlistItemRecord[]>;
  createWishlist(input: Omit<WishlistItemRecord, "id" | "createdAt" | "updatedAt">): Promise<WishlistItemRecord>;
  updateWishlist(userId: string, itemId: string, patch: Partial<Pick<WishlistItemRecord, "kind" | "title" | "details" | "targetDate" | "progress" | "completed">>): Promise<WishlistItemRecord | null>;
  deleteWishlist(userId: string, itemId: string): Promise<boolean>;
  listCapsules(userId: string): Promise<TimeCapsuleRecord[]>;
  createCapsule(input: Omit<TimeCapsuleRecord, "id" | "createdAt" | "openedAt">): Promise<TimeCapsuleRecord>;
  openCapsule(userId: string, capsuleId: string, now: Date): Promise<TimeCapsuleRecord | null>;
  getRelationshipCounts(userId: string): Promise<RelationshipCounts>;
}

export interface AppStore {
  auth: AuthStores;
  messages: MessageStore;
  proactive: ProactiveSettingsStore;
  billing: BillingStore;
  space: SpaceStore;
}
