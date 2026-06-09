import type { CurrentUser, Message, ProactiveSettings } from "../shared/types.js";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "request_failed");
  }
  return data as T;
}

export const api = {
  me: () => apiFetch<{ user: CurrentUser | null }>("/api/auth/me"),
  sendCode: (target: string, purpose: "register" | "reset_password") =>
    apiFetch<{ maskedTarget: string; expiresAt: string; devCode?: string }>("/api/auth/send-code", {
      method: "POST",
      body: JSON.stringify({ target, purpose }),
    }),
  register: (input: { identifier: string; code: string; password: string; displayName?: string }) =>
    apiFetch<{ user: CurrentUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  login: (input: { identifier: string; password: string }) =>
    apiFetch<{ user: CurrentUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  resetPassword: (input: { identifier: string; code: string; newPassword: string }) =>
    apiFetch<{ ok: true }>("/api/auth/password/reset", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => apiFetch<{ ok: true }>("/api/auth/logout", { method: "POST" }),
  wechatUrl: () => apiFetch<{ url: string }>("/api/auth/wechat/url"),
  updateProfile: (input: { displayName?: string; avatarUrl?: string | null }) =>
    apiFetch<{ user: CurrentUser }>("/api/profile", {
      method: "PUT",
      body: JSON.stringify(input),
    }),
  messages: () => apiFetch<{ messages: Message[] }>("/api/messages"),
  clearMessages: () => apiFetch<{ ok: true }>("/api/messages", { method: "DELETE" }),
  chat: (messages: Pick<Message, "role" | "text">[]) =>
    apiFetch<{ response: string; messages: Message[] }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages }),
    }),
  tts: (text: string) =>
    apiFetch<{ audio: string; mimeType: string } | undefined>("/api/tts", {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  getProactiveSettings: () => apiFetch<{ settings: ProactiveSettings & { lastNudgeAt?: string | null } }>("/api/settings/proactive"),
  saveProactiveSettings: (settings: ProactiveSettings) =>
    apiFetch<{ settings: ProactiveSettings }>("/api/settings/proactive", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  checkProactive: () =>
    apiFetch<{ due: boolean; message?: Message }>("/api/proactive/check", {
      method: "POST",
      body: JSON.stringify({ localDate: new Date().toISOString().slice(0, 10) }),
    }),
};
