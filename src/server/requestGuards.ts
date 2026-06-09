import type { ChatMessageInput } from "./providers/types.js";

export function sanitizeChatMessages(input: unknown, maxMessages = 10): ChatMessageInput[] {
  if (!Array.isArray(input)) throw new Error("messages_required");

  const messages = input
    .map((message) => {
      if (!message || typeof message !== "object") return null;
      const source = message as Record<string, unknown>;
      if (source.role !== "user" && source.role !== "model") return null;
      if (typeof source.text !== "string") return null;
      const text = source.text.trim().slice(0, 4000);
      if (!text) return null;
      return { role: source.role, text };
    })
    .filter((message): message is ChatMessageInput => message !== null);

  if (!messages.some((message) => message.role === "user")) throw new Error("user_message_required");
  return messages.slice(-maxMessages);
}

export function getRequestIp(headers: Record<string, string | string[] | undefined>, fallback = "unknown") {
  const forwarded = headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || fallback;
}
