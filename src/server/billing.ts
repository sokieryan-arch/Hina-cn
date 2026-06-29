export type BillingPlan = "free" | "pro";

export interface BillingLimits {
  freeDailyChatLimit: number;
  proDailyChatLimit: number | null;
}

export interface BillingSummary {
  plan: BillingPlan;
  isPro: boolean;
  dailyLimit: number | null;
  usedToday: number;
  remainingToday: number | null;
  resetAt: string;
}

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000;
type BillingEnv = Partial<Pick<NodeJS.ProcessEnv, "FREE_DAILY_CHAT_LIMIT" | "PRO_DAILY_CHAT_LIMIT">>;

function parseLimit(value: unknown, fallback: number | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  if (parsed === 0) return null;
  return Math.floor(parsed);
}

export function readBillingLimits(env: BillingEnv = process.env): BillingLimits {
  return {
    freeDailyChatLimit: parseLimit(env.FREE_DAILY_CHAT_LIMIT, 30) ?? 30,
    proDailyChatLimit: parseLimit(env.PRO_DAILY_CHAT_LIMIT, null),
  };
}

export function getUsageDate(now = new Date()): string {
  return new Date(now.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

export function getResetAt(now = new Date()): Date {
  const shifted = new Date(now.getTime() + CHINA_OFFSET_MS);
  const year = shifted.getUTCFullYear();
  const month = shifted.getUTCMonth();
  const day = shifted.getUTCDate();
  return new Date(Date.UTC(year, month, day + 1) - CHINA_OFFSET_MS);
}

interface BuildBillingSummaryInput {
  plan: BillingPlan;
  chatCount: number;
  now?: Date;
  proExpiresAt?: Date | string | null;
  limits?: BillingLimits;
}

function isActivePro(input: BuildBillingSummaryInput, now: Date) {
  if (input.plan !== "pro") return false;
  if (!input.proExpiresAt) return true;
  return new Date(input.proExpiresAt).getTime() > now.getTime();
}

export function buildBillingSummary(input: BuildBillingSummaryInput): BillingSummary {
  const now = input.now ?? new Date();
  const limits = input.limits ?? readBillingLimits();
  const isPro = isActivePro(input, now);
  const dailyLimit = isPro ? limits.proDailyChatLimit : limits.freeDailyChatLimit;
  const usedToday = Math.max(0, Math.floor(input.chatCount || 0));
  const remainingToday = dailyLimit === null ? null : Math.max(0, dailyLimit - usedToday);

  return {
    plan: isPro ? "pro" : "free",
    isPro,
    dailyLimit,
    usedToday,
    remainingToday,
    resetAt: getResetAt(now).toISOString(),
  };
}

export function canUseChat(summary: BillingSummary): boolean {
  return summary.remainingToday === null || summary.remainingToday > 0;
}
