import { EN_RESOURCES, type EnglishResourceKey } from "./resources/en.js";

export interface ChatPlaceholderContext {
  presence?: string;
  festival?: string;
}

interface PickChatPlaceholderOptions {
  context?: ChatPlaceholderContext;
  random?: () => number;
}

const DEFAULT_PREFIX = "chat.placeholder.default.";
const RESOURCE_ENTRIES = Object.entries(EN_RESOURCES) as Array<[EnglishResourceKey, string]>;

function resourceSegment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function valuesWithPrefix(prefix: string) {
  return RESOURCE_ENTRIES
    .filter(([key]) => key.startsWith(prefix))
    .map(([, value]) => value);
}

export function getChatPlaceholderCandidates(context: ChatPlaceholderContext = {}) {
  const contextualPrefixes = [
    context.festival && `chat.placeholder.festival.${resourceSegment(context.festival)}.`,
    context.presence && `chat.placeholder.presence.${resourceSegment(context.presence)}.`,
  ].filter((prefix): prefix is string => Boolean(prefix));

  for (const prefix of contextualPrefixes) {
    const candidates = valuesWithPrefix(prefix);
    if (candidates.length > 0) return candidates;
  }

  return valuesWithPrefix(DEFAULT_PREFIX);
}

export function pickChatPlaceholder({ context, random = Math.random }: PickChatPlaceholderOptions = {}) {
  const candidates = getChatPlaceholderCandidates(context);
  if (candidates.length === 0) return "";

  const value = random();
  const safeValue = Number.isFinite(value) ? Math.min(Math.max(value, 0), 0.999999999999) : 0;
  return candidates[Math.floor(safeValue * candidates.length)];
}
