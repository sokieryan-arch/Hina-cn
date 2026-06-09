export interface ProactiveSettings {
  enabled: boolean;
  minHoursBetweenNudges: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  favoriteTopics: string[];
}

export interface ProactiveState {
  now: Date;
  lastInteractionAt?: Date | null;
}

export interface ProactivePromptInput {
  localDate: string;
  favoriteTopics: string[];
  recentMessages: string[];
}

const DEFAULT_SETTINGS: ProactiveSettings = {
  enabled: false,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: [],
};

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function currentMinutes(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

function isInsideQuietHours(date: Date, start: string, end: string): boolean {
  const now = currentMinutes(date);
  const startMinutes = minutesFromTime(start);
  const endMinutes = minutesFromTime(end);

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return now >= startMinutes && now < endMinutes;
  }

  return now >= startMinutes || now < endMinutes;
}

export function normalizeProactiveSettings(input: unknown): ProactiveSettings {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const minHours = typeof source.minHoursBetweenNudges === "number"
    ? Math.min(72, Math.max(6, Math.floor(source.minHoursBetweenNudges)))
    : DEFAULT_SETTINGS.minHoursBetweenNudges;

  const topics = Array.isArray(source.favoriteTopics)
    ? source.favoriteTopics
      .map((topic) => typeof topic === "string" ? topic.trim().slice(0, 40) : "")
      .filter(Boolean)
      .slice(0, 3)
    : [];

  return {
    enabled: source.enabled === true,
    minHoursBetweenNudges: minHours,
    quietHoursStart: isTime(source.quietHoursStart) ? source.quietHoursStart : DEFAULT_SETTINGS.quietHoursStart,
    quietHoursEnd: isTime(source.quietHoursEnd) ? source.quietHoursEnd : DEFAULT_SETTINGS.quietHoursEnd,
    favoriteTopics: topics,
  };
}

export function shouldCreateProactiveNudge(settings: ProactiveSettings, state: ProactiveState): boolean {
  if (!settings.enabled) return false;
  if (isInsideQuietHours(state.now, settings.quietHoursStart, settings.quietHoursEnd)) {
    return false;
  }

  if (!state.lastInteractionAt) return true;
  const elapsedMs = state.now.getTime() - state.lastInteractionAt.getTime();
  return elapsedMs >= settings.minHoursBetweenNudges * 60 * 60 * 1000;
}

export function buildProactivePrompt(input: ProactivePromptInput): string {
  const topics = input.favoriteTopics.length > 0
    ? input.favoriteTopics.join(", ")
    : "everyday life, New York micro-adventures, study motivation";
  const recent = input.recentMessages.slice(-5).map((message) => `- ${message}`).join("\n");

  return [
    "Create one proactive conversation opener from Hina, the user's quirky English learning partner.",
    `Local date: ${input.localDate}`,
    `User interests to weave in if natural: ${topics}`,
    recent ? `Recent context:\n${recent}` : "Recent context: no prior details available.",
    "The opener should feel like a friend throwing an irresistible topic, not like a system notification.",
    "Keep it under 55 words and include one easy question the user can answer in English.",
  ].join("\n");
}
