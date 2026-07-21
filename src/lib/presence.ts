export type PresenceStatus =
  | "online"
  | "sleeping"
  | "coffee"
  | "reading"
  | "drawing"
  | "walking"
  | "daydreaming"
  | "preparing"
  | "thinking"
  | "speaking";

export interface PresenceDefinition {
  label: string;
  dotClass: string;
  textClass: string;
}

export const PRESENCE_DEFINITIONS: Record<PresenceStatus, PresenceDefinition> = {
  online: { label: "Online", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  sleeping: { label: "🌙 Sleeping", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  coffee: { label: "☕ Making coffee", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  reading: { label: "📚 Reading", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  drawing: { label: "🎨 Drawing", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  walking: { label: "🚶 Walking", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  daydreaming: { label: "💭 Daydreaming", dotClass: "bg-[#21A366]", textClass: "text-[#347759] dark:text-[#7ed9a8]" },
  preparing: { label: "Preparing", dotClass: "bg-[#54B9E8]", textClass: "text-[#2982A8] dark:text-[#8bd8f7]" },
  thinking: { label: "Thinking", dotClass: "bg-[#2457A7]", textClass: "text-[#2457A7] dark:text-[#8eb5f4]" },
  speaking: { label: "Speaking", dotClass: "bg-[#F29A38]", textClass: "text-[#B96516] dark:text-[#ffc27c]" },
};

function newYorkParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    hour: Number(values.hour),
    minute: Number(values.minute),
  };
}

function stableIndex(seed: string, length: number) {
  let hash = 2166136261;
  for (const character of seed) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % length;
}

export function ambientPresence(now = new Date()): PresenceStatus {
  const ny = newYorkParts(now);
  const slot = Math.floor(ny.minute / 30);
  const seed = `${ny.date}:${ny.hour}:${slot}`;
  let options: PresenceStatus[];
  if (ny.hour < 6) options = ["sleeping", "sleeping", "sleeping", "daydreaming"];
  else if (ny.hour < 9) options = ["coffee", "coffee", "walking", "online"];
  else if (ny.hour < 12) options = ["reading", "online", "coffee", "walking"];
  else if (ny.hour < 17) options = ["reading", "drawing", "online", "daydreaming", "walking"];
  else if (ny.hour < 21) options = ["walking", "drawing", "coffee", "online", "reading"];
  else options = ["reading", "daydreaming", "online", "sleeping"];
  return options[stableIndex(seed, options.length)];
}

export function resolvePresence(input: {
  ambient: PresenceStatus;
  preparing?: boolean;
  thinking?: boolean;
  speaking?: boolean;
}): PresenceStatus {
  if (input.speaking) return "speaking";
  if (input.thinking) return "thinking";
  if (input.preparing) return "preparing";
  return input.ambient;
}
