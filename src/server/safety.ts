const HIGH_RISK_PATTERNS = [
  /\b(?:kill myself|end my life|suicide|hurt myself)\b/i,
  /(?:自杀|结束生命|不想活了|伤害自己)/,
];

export function hasImmediateSafetyRisk(text: string) {
  const normalized = text.trim();
  return normalized.length > 0 && HIGH_RISK_PATTERNS.some((pattern) => pattern.test(normalized));
}

export const SAFETY_SUPPORT_MESSAGE = [
  "I’m really sorry you’re carrying this right now.",
  "Please pause the chat and contact someone you trust or local emergency services immediately.",
  "You deserve support from a real person who can stay with you.",
].join(" ");
