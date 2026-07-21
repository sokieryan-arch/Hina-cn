import { createHash } from "node:crypto";
import type { LanguageTip, StudyCategory } from "../shared/languageTips.js";
import type {
  RelationshipSummary,
  TimeCapsule,
  WishlistKind,
  WishlistSuggestion,
} from "../shared/types.js";
import type {
  RelationshipCounts,
  StudyNoteRecord,
  TimeCapsuleRecord,
  WishlistItemRecord,
} from "./store/types.js";

export const STUDY_CATEGORIES = new Set<StudyCategory>(["grammar", "vocabulary", "expression", "culture"]);
export const WISHLIST_KINDS = new Set<WishlistKind>(["goal", "hook", "place", "note"]);

const HOLIDAYS: Array<{ monthDay: string; name: string }> = [
  { monthDay: "01-01", name: "New Year's Day" },
  { monthDay: "02-14", name: "Valentine's Day" },
  { monthDay: "08-15", name: "Obon" },
  { monthDay: "10-31", name: "Halloween" },
  { monthDay: "12-25", name: "Christmas" },
];

const MOVABLE_HOLIDAYS: Record<number, Array<{ date: string; name: string }>> = {
  2026: [
    { date: "2026-02-17", name: "Lunar New Year" },
    { date: "2026-03-03", name: "Lantern Festival" },
    { date: "2026-09-25", name: "Mid-Autumn Festival" },
    { date: "2026-11-26", name: "Thanksgiving" },
  ],
  2027: [
    { date: "2027-02-06", name: "Lunar New Year" },
    { date: "2027-02-20", name: "Lantern Festival" },
    { date: "2027-09-15", name: "Mid-Autumn Festival" },
    { date: "2027-11-25", name: "Thanksgiving" },
  ],
  2028: [
    { date: "2028-01-26", name: "Lunar New Year" },
    { date: "2028-02-09", name: "Lantern Festival" },
    { date: "2028-10-03", name: "Mid-Autumn Festival" },
    { date: "2028-11-23", name: "Thanksgiving" },
  ],
};

export function dateKey(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function newYorkHolidayContext(now: Date): string | null {
  const key = dateKey(now, "America/New_York");
  const year = Number(key.slice(0, 4));
  const movable = MOVABLE_HOLIDAYS[year]?.find((holiday) => holiday.date === key);
  if (movable) return movable.name;
  return HOLIDAYS.find((holiday) => key.endsWith(holiday.monthDay))?.name ?? null;
}

export function nextHoliday(now: Date): { name: string; date: string } {
  const currentYear = Number(dateKey(now, "Asia/Shanghai").slice(0, 4));
  const candidates: Array<{ name: string; date: string }> = [];
  for (const year of [currentYear, currentYear + 1]) {
    for (const holiday of HOLIDAYS) candidates.push({ name: holiday.name, date: `${year}-${holiday.monthDay}` });
    candidates.push(...(MOVABLE_HOLIDAYS[year] ?? []));
  }
  const today = dateKey(now, "Asia/Shanghai");
  return candidates.filter((holiday) => holiday.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
    ?? { name: "New Year's Day", date: `${currentYear + 1}-01-01` };
}

export function nextMomentDue(now: Date): Date {
  const digest = createHash("sha256").update(now.toISOString()).digest();
  const hours = 48 + (digest[0] % 25);
  return new Date(now.getTime() + hours * 60 * 60 * 1000);
}

export function normalizeWishlistSuggestion(value: unknown): WishlistSuggestion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  const kind = typeof source.kind === "string" ? source.kind.trim().toLowerCase() as WishlistKind : "goal";
  const title = typeof source.title === "string" ? source.title.trim().slice(0, 120) : "";
  if (!WISHLIST_KINDS.has(kind) || !title) return undefined;
  const details = typeof source.details === "string" ? source.details.trim().slice(0, 500) : "";
  return { kind, title, ...(details ? { details } : {}) };
}

export function studyCategoryForTip(tip: LanguageTip): StudyCategory {
  if (tip.studyCategory && STUDY_CATEGORIES.has(tip.studyCategory)) return tip.studyCategory;
  if (tip.type === "correction") return "grammar";
  return tip.type;
}

export function noteDedupeKey(tip: LanguageTip): string {
  const source = [tip.studyCategory, tip.type, tip.original, tip.suggestion, tip.title, tip.body]
    .filter(Boolean)
    .join("|")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(source).digest("hex");
}

export function toClientNote(note: StudyNoteRecord) {
  return {
    id: note.id,
    category: note.category,
    title: note.title,
    body: note.body,
    example: note.example ?? null,
    original: note.original ?? null,
    suggestion: note.suggestion ?? null,
    createdAt: note.createdAt.toISOString(),
  };
}

export function toClientWishlist(item: WishlistItemRecord) {
  return {
    id: item.id,
    kind: item.kind,
    title: item.title,
    details: item.details ?? null,
    targetDate: item.targetDate ?? null,
    progress: item.progress,
    completed: item.completed,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export function toClientCapsule(capsule: TimeCapsuleRecord, now: Date): TimeCapsule {
  const isUnlocked = capsule.unlockAt.getTime() <= now.getTime();
  const isOpened = Boolean(capsule.openedAt);
  return {
    id: capsule.id,
    title: capsule.title,
    body: isUnlocked && isOpened ? capsule.body : null,
    unlockAt: capsule.unlockAt.toISOString(),
    openedAt: capsule.openedAt?.toISOString() ?? null,
    isUnlocked,
    isOpened,
    createdAt: capsule.createdAt.toISOString(),
  };
}

function utcDayNumber(key: string): number {
  const [year, month, day] = key.split("-").map(Number);
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

function currentStreak(dates: string[], today: string): number {
  const days = new Set(dates.map(utcDayNumber));
  let cursor = utcDayNumber(today);
  if (!days.has(cursor) && days.has(cursor - 1)) cursor -= 1;
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor -= 1;
  }
  return count;
}

export function buildRelationshipSummary(input: {
  createdAt: Date;
  counts: RelationshipCounts;
  now?: Date;
}): RelationshipSummary {
  const now = input.now ?? new Date();
  const today = dateKey(now, "Asia/Shanghai");
  const created = dateKey(input.createdAt, "Asia/Shanghai");
  const knownDays = Math.max(1, utcDayNumber(today) - utcDayNumber(created) + 1);
  const nextHundred = (Math.floor(knownDays / 100) + 1) * 100;
  const nextHundredDay = new Date((utcDayNumber(created) + nextHundred - 1) * 86_400_000);
  const milestones = [
    { label: "First hello", reached: input.counts.messageCount > 0, value: 1 },
    { label: "30 days together", reached: knownDays >= 30, value: 30 },
    { label: "100 shared days", reached: knownDays >= 100, value: 100 },
    { label: "1,000 messages", reached: input.counts.messageCount >= 1000, value: 1000 },
  ];
  return {
    knownDays,
    messages: input.counts.messageCount,
    sharedMemories: input.counts.conversationDates.length,
    currentStreak: currentStreak(input.counts.conversationDates, today),
    notesCount: input.counts.notesCount,
    completedGoals: input.counts.completedGoals,
    milestones,
    nextHundredDayAt: nextHundredDay.toISOString(),
    nextHoliday: nextHoliday(now),
  };
}
