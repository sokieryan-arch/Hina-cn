export type LanguageTipType = "correction" | "expression" | "culture";
export type StudyCategory = "grammar" | "vocabulary" | "expression" | "culture";

export interface LanguageTip {
  type: LanguageTipType;
  studyCategory?: StudyCategory;
  title: string;
  body: string;
  example?: string;
  original?: string;
  suggestion?: string;
}

const FALLBACK_TIPS: LanguageTip[] = [
  {
    type: "correction",
    title: "Tiny grammar fix",
    body: "Polish one specific phrase from your message. For example: \"where are you located in now?\" sounds more natural as \"Where are you based now?\"",
    original: "where are you located in now?",
    suggestion: "Where are you based now?",
  },
  {
    type: "expression",
    title: "Phrase to steal",
    body: "Try reusing a vivid phrase like \"rent-free in my mind（一直萦绕在脑海里）\" when something keeps popping back into your thoughts.",
    example: "That tiny coffee shop lives rent-free in my mind.",
  },
];

const TIP_TYPES = new Set<LanguageTipType>(["correction", "expression", "culture"]);

function normalizeType(value: unknown): LanguageTipType | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (TIP_TYPES.has(normalized as LanguageTipType)) return normalized as LanguageTipType;
  if (normalized.includes("grammar") || normalized.includes("correction") || normalized.includes("fix")) {
    return "correction";
  }
  if (normalized.includes("expression") || normalized.includes("phrase") || normalized.includes("idiom") || normalized.includes("word")) {
    return "expression";
  }
  if (normalized.includes("culture") || normalized.includes("nuance")) {
    return "culture";
  }
  return null;
}

function titleFromTypeLabel(value: unknown, type: LanguageTipType): string {
  if (typeof value === "string" && value.trim()) {
    return value.trim().replace(/\s+/g, " ").replace(/^./, (letter) => letter.toUpperCase()).slice(0, 80);
  }
  if (type === "correction") return "Tiny grammar fix";
  if (type === "culture") return "Culture note";
  return "Useful expression";
}

function truncate(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().replace(/\s+/g, " ");
  if (!text) return undefined;
  return text.slice(0, maxLength);
}

function normalizeTip(value: unknown, index: number): LanguageTip | null {
  if (!value || typeof value !== "object") return null;
  const source = value as Record<string, unknown>;
  const type = normalizeType(source.type ?? source.kind ?? source.category)
    ?? (index === 0 ? "correction" : index === 1 ? "expression" : null);
  if (!type) return null;

  const title = truncate(source.title, 80) ?? titleFromTypeLabel(source.type ?? source.kind ?? source.category, type);
  const body = truncate(source.body ?? source.content ?? source.explanation ?? source.tip, 480);
  if (!body) return null;

  const tip: LanguageTip = {
    type,
    title,
    body,
  };

  const studyCategory = normalizeStudyCategory(source.studyCategory, type);
  if (studyCategory) tip.studyCategory = studyCategory;

  const example = truncate(source.example, 180);
  const original = truncate(source.original, 180);
  const suggestion = truncate(source.suggestion, 180);

  if (example) tip.example = example;
  if (original) tip.original = original;
  if (suggestion) tip.suggestion = suggestion;

  return tip;
}

function normalizeStudyCategory(value: unknown, type: LanguageTipType): StudyCategory {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["grammar", "vocabulary", "expression", "culture"].includes(normalized)) {
      return normalized as StudyCategory;
    }
  }
  if (type === "correction") return "grammar";
  return type;
}

export function normalizeLanguageTips(input: unknown): LanguageTip[] {
  const normalized = Array.isArray(input)
    ? input.map((tip, index) => normalizeTip(tip, index)).filter((tip): tip is LanguageTip => tip !== null)
    : [];

  const tips = normalized.slice(0, 2);
  for (const fallback of FALLBACK_TIPS) {
    if (tips.length >= 2) break;
    if (!tips.some((tip) => tip.type === fallback.type)) {
      tips.push(fallback);
    }
  }

  return tips.slice(0, 2);
}
