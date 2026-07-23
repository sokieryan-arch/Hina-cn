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
  UserSafetyProfileRecord,
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
  const safetyProfiles = new Map<string, UserSafetyProfileRecord>();
  const feedback = new Map<string, Array<{
    id: string;
    userId: string;
    category: "bug" | "safety" | "privacy" | "other";
    message: string;
    contact?: string | null;
    createdAt: Date;
  }>>();

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
    account: {
      async getSafetyProfile(userId) {
        return safetyProfiles.get(userId) ?? null;
      },
      async saveSafetyProfile(input) {
        const now = new Date();
        const record: UserSafetyProfileRecord = {
          ...input,
          consentedAt: now,
          updatedAt: now,
        };
        safetyProfiles.set(input.userId, record);
        return record;
      },
      async createFeedback(input) {
        const record = { ...input, id: nanoid(), createdAt: new Date() };
        feedback.set(input.userId, [...(feedback.get(input.userId) ?? []), record]);
        return record;
      },
      async exportUserData(userId) {
        const user = await auth.users.findById(userId);
        if (!user) throw new Error("user_not_found");
        const { passwordHash: _passwordHash, ...safeUser } = user;
        return {
          exportedAt: new Date().toISOString(),
          user: safeUser,
          messages: messages.get(userId) ?? [],
          proactiveSettings: proactive.get(userId) ?? null,
          billing: await billing.getBillingSummary(userId),
          studyNotes: notes.get(userId) ?? [],
          wishlist: wishlist.get(userId) ?? [],
          capsules: capsules.get(userId) ?? [],
          safetyProfile: safetyProfiles.get(userId) ?? null,
          feedback: feedback.get(userId) ?? [],
        };
      },
      async mergeUsers(sourceUserId, targetUserId) {
        if (sourceUserId === targetUserId) return;
        const [source, target] = await Promise.all([
          auth.users.findById(sourceUserId),
          auth.users.findById(targetUserId),
        ]);
        if (!source || !target) throw new Error("user_not_found");

        messages.set(targetUserId, [
          ...(messages.get(targetUserId) ?? []),
          ...(messages.get(sourceUserId) ?? []).map((message) => ({ ...message, userId: targetUserId })),
        ]);
        messages.delete(sourceUserId);

        const targetNotes = notes.get(targetUserId) ?? [];
        const dedupeKeys = new Set(targetNotes.map((note) => note.dedupeKey));
        notes.set(targetUserId, [
          ...targetNotes,
          ...(notes.get(sourceUserId) ?? [])
            .filter((note) => !dedupeKeys.has(note.dedupeKey))
            .map((note) => ({ ...note, userId: targetUserId })),
        ]);
        notes.delete(sourceUserId);

        wishlist.set(targetUserId, [
          ...(wishlist.get(targetUserId) ?? []),
          ...(wishlist.get(sourceUserId) ?? []).map((item) => ({ ...item, userId: targetUserId })),
        ]);
        wishlist.delete(sourceUserId);
        capsules.set(targetUserId, [
          ...(capsules.get(targetUserId) ?? []),
          ...(capsules.get(sourceUserId) ?? []).map((item) => ({ ...item, userId: targetUserId })),
        ]);
        capsules.delete(sourceUserId);

        const sourceProactive = proactive.get(sourceUserId);
        const targetProactive = proactive.get(targetUserId);
        if (sourceProactive) {
          proactive.set(targetUserId, targetProactive
            ? {
              ...targetProactive,
              enabled: targetProactive.enabled || sourceProactive.enabled,
              favoriteTopics: Array.from(new Set([
                ...targetProactive.favoriteTopics,
                ...sourceProactive.favoriteTopics,
              ])).slice(0, 5),
              lastNudgeAt: !targetProactive.lastNudgeAt
                || (sourceProactive.lastNudgeAt && sourceProactive.lastNudgeAt > targetProactive.lastNudgeAt)
                ? sourceProactive.lastNudgeAt
                : targetProactive.lastNudgeAt,
            }
            : { ...sourceProactive });
          proactive.delete(sourceUserId);
        }

        for (const [key, value] of usageDaily.entries()) {
          if (!key.startsWith(`${sourceUserId}:`)) continue;
          const targetKey = `${targetUserId}:${key.slice(sourceUserId.length + 1)}`;
          usageDaily.set(targetKey, (usageDaily.get(targetKey) ?? 0) + value);
          usageDaily.delete(key);
        }

        const sourceEntitlement = entitlements.get(sourceUserId);
        const targetEntitlement = entitlements.get(targetUserId);
        if (sourceEntitlement && (!targetEntitlement || (sourceEntitlement.plan === "pro" && targetEntitlement.plan !== "pro"))) {
          entitlements.set(targetUserId, sourceEntitlement);
        }
        entitlements.delete(sourceUserId);

        if (!safetyProfiles.has(targetUserId) && safetyProfiles.has(sourceUserId)) {
          safetyProfiles.set(targetUserId, {
            ...safetyProfiles.get(sourceUserId)!,
            userId: targetUserId,
          });
        }
        safetyProfiles.delete(sourceUserId);
        feedback.set(targetUserId, [
          ...(feedback.get(targetUserId) ?? []),
          ...(feedback.get(sourceUserId) ?? []).map((item) => ({ ...item, userId: targetUserId })),
        ]);
        feedback.delete(sourceUserId);

        await auth.users.reassignExternalIdentities(sourceUserId, targetUserId);
        await auth.users.delete(sourceUserId);
      },
      async deleteUser(userId) {
        messages.delete(userId);
        proactive.delete(userId);
        entitlements.delete(userId);
        notes.delete(userId);
        wishlist.delete(userId);
        capsules.delete(userId);
        safetyProfiles.delete(userId);
        feedback.delete(userId);
        for (const key of usageDaily.keys()) {
          if (key.startsWith(`${userId}:`)) usageDaily.delete(key);
        }
        await auth.users.delete(userId);
      },
    },
  };
}
