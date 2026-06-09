import { nanoid } from "nanoid";
import { normalizeProactiveSettings } from "../proactive.js";
import { createMemoryAuthStores } from "../auth/memoryStores.js";
import type {
  AppStore,
  CreateMessageInput,
  MessageRecord,
  ProactiveSettingsRecord,
} from "./types.js";

export function createMemoryAppStore(): AppStore {
  const auth = createMemoryAuthStores();
  const messages = new Map<string, MessageRecord[]>();
  const proactive = new Map<string, ProactiveSettingsRecord>();

  async function getProactiveSettings(userId: string) {
    const existing = proactive.get(userId);
    if (existing) return existing;
    const initial = { ...normalizeProactiveSettings({}), lastNudgeAt: null };
    proactive.set(userId, initial);
    return initial;
  }

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
  };
}
