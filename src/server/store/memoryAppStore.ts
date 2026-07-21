import { nanoid } from "nanoid";
import { buildBillingSummary, getUsageDate } from "../billing.js";
import { normalizeProactiveSettings } from "../proactive.js";
import { createMemoryAuthStores } from "../auth/memoryStores.js";
import type {
  AppStore,
  BillingStore,
  CreateMessageInput,
  HinaMomentRecord,
  MessageRecord,
  ProactiveSettingsRecord,
  StudyNoteRecord,
  TimeCapsuleRecord,
  WishlistItemRecord,
} from "./types.js";

export function createMemoryAppStore(): AppStore {
  const auth = createMemoryAuthStores();
  const messages = new Map<string, MessageRecord[]>();
  const proactive = new Map<string, ProactiveSettingsRecord>();
  const entitlements = new Map<string, { plan: "free" | "pro"; proExpiresAt: Date | null }>();
  const usageDaily = new Map<string, number>();
  const moments: HinaMomentRecord[] = [];
  const notes = new Map<string, StudyNoteRecord[]>();
  const wishlist = new Map<string, WishlistItemRecord[]>();
  const capsules = new Map<string, TimeCapsuleRecord[]>();

  async function getProactiveSettings(userId: string) {
    const existing = proactive.get(userId);
    if (existing) return existing;
    const initial = { ...normalizeProactiveSettings({}), lastNudgeAt: null };
    proactive.set(userId, initial);
    return initial;
  }

  function usageKey(userId: string, now: Date) {
    return `${userId}:${getUsageDate(now)}`;
  }

  const billing: BillingStore = {
    async getBillingSummary(userId, now = new Date()) {
      const entitlement = entitlements.get(userId) ?? { plan: "free" as const, proExpiresAt: null };
      return buildBillingSummary({
        plan: entitlement.plan,
        proExpiresAt: entitlement.proExpiresAt,
        chatCount: usageDaily.get(usageKey(userId, now)) ?? 0,
        now,
      });
    },
    async incrementChatUsage(userId, now = new Date()) {
      const key = usageKey(userId, now);
      usageDaily.set(key, (usageDaily.get(key) ?? 0) + 1);
      return this.getBillingSummary(userId, now);
    },
    async setPlan(userId, plan, proExpiresAt = null, now = new Date()) {
      entitlements.set(userId, { plan, proExpiresAt });
      return this.getBillingSummary(userId, now);
    },
  };

  return {
    auth,
    messages: {
      async listMessages(userId) {
        return [...(messages.get(userId) ?? [])].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      async addMessage(input: CreateMessageInput) {
        const record: MessageRecord = {
          id: input.id ?? nanoid(),
          userId: input.userId,
          role: input.role,
          text: input.text,
          type: input.type ?? "response",
          tipKind: input.tipKind ?? null,
          createdAt: new Date(),
        };
        messages.set(input.userId, [...(messages.get(input.userId) ?? []), record]);
        return record;
      },
      async clearMessages(userId) {
        messages.delete(userId);
      },
    },
    proactive: {
      getProactiveSettings,
      async saveProactiveSettings(userId, settings) {
        const previous = await getProactiveSettings(userId);
        const next = {
          ...normalizeProactiveSettings(settings),
          lastNudgeAt: previous.lastNudgeAt ?? null,
        };
        proactive.set(userId, next);
        return next;
      },
      async markProactiveNudge(userId, at) {
        const current = await getProactiveSettings(userId);
        proactive.set(userId, { ...current, lastNudgeAt: at });
      },
    },
    billing,
    space: {
      async listMoments(limit = 40) {
        return [...moments]
          .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
          .slice(0, limit);
      },
      async latestMoment() {
        return [...moments].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0] ?? null;
      },
      async addMomentIfDue(input) {
        const latest = [...moments].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())[0];
        if (latest && latest.nextDueAt.getTime() > input.now.getTime()) return null;
        const record: HinaMomentRecord = {
          id: nanoid(),
          body: input.body,
          occasion: input.occasion ?? null,
          publishedAt: input.now,
          nextDueAt: input.nextDueAt,
        };
        moments.push(record);
        return record;
      },
      async listNotes(userId, category) {
        return (notes.get(userId) ?? [])
          .filter((note) => !category || note.category === category)
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async saveNote(input) {
        const current = notes.get(input.userId) ?? [];
        if (current.some((note) => note.dedupeKey === input.dedupeKey)) return null;
        const record: StudyNoteRecord = { ...input, id: nanoid(), createdAt: new Date() };
        notes.set(input.userId, [...current, record]);
        return record;
      },
      async deleteNote(userId, noteId) {
        const current = notes.get(userId) ?? [];
        const next = current.filter((note) => note.id !== noteId);
        notes.set(userId, next);
        return next.length !== current.length;
      },
      async clearNotes(userId) {
        notes.delete(userId);
      },
      async listWishlist(userId) {
        return [...(wishlist.get(userId) ?? [])].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async createWishlist(input) {
        const now = new Date();
        const record: WishlistItemRecord = { ...input, id: nanoid(), createdAt: now, updatedAt: now };
        wishlist.set(input.userId, [...(wishlist.get(input.userId) ?? []), record]);
        return record;
      },
      async updateWishlist(userId, itemId, patch) {
        const current = wishlist.get(userId) ?? [];
        const existing = current.find((item) => item.id === itemId);
        if (!existing) return null;
        const updated: WishlistItemRecord = { ...existing, ...patch, updatedAt: new Date() };
        wishlist.set(userId, current.map((item) => item.id === itemId ? updated : item));
        return updated;
      },
      async deleteWishlist(userId, itemId) {
        const current = wishlist.get(userId) ?? [];
        const next = current.filter((item) => item.id !== itemId);
        wishlist.set(userId, next);
        return next.length !== current.length;
      },
      async listCapsules(userId) {
        return [...(capsules.get(userId) ?? [])].sort((a, b) => a.unlockAt.getTime() - b.unlockAt.getTime());
      },
      async createCapsule(input) {
        const record: TimeCapsuleRecord = {
          ...input,
          id: nanoid(),
          openedAt: null,
          createdAt: new Date(),
        };
        capsules.set(input.userId, [...(capsules.get(input.userId) ?? []), record]);
        return record;
      },
      async openCapsule(userId, capsuleId, now) {
        const current = capsules.get(userId) ?? [];
        const existing = current.find((capsule) => capsule.id === capsuleId);
        if (!existing || existing.unlockAt.getTime() > now.getTime()) return null;
        const opened = { ...existing, openedAt: existing.openedAt ?? now };
        capsules.set(userId, current.map((capsule) => capsule.id === capsuleId ? opened : capsule));
        return opened;
      },
      async getRelationshipCounts(userId) {
        const conversationDates = Array.from(new Set(
          (messages.get(userId) ?? [])
            .filter((message) => message.role === "user" && message.type === "response")
            .map((message) => message.createdAt.toLocaleDateString("en-CA", { timeZone: "Asia/Shanghai" })),
        ));
        return {
          messageCount: (messages.get(userId) ?? []).filter((message) => message.type !== "tip").length,
          conversationDates,
          notesCount: (notes.get(userId) ?? []).length,
          completedGoals: (wishlist.get(userId) ?? []).filter((item) => item.completed).length,
        };
      },
    },
  };
}
