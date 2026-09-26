import type { LanguageCode, LanguageSettings } from "../shared/practiceTypes";

export interface LanguageOption {
  code: LanguageCode;
  nativeLabel: string;
  englishLabel: string;
}

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { code: "en", nativeLabel: "English", englishLabel: "English" },
  { code: "zh-CN", nativeLabel: "简体中文", englishLabel: "Simplified Chinese" },
  { code: "ja", nativeLabel: "日本語", englishLabel: "Japanese" },
  { code: "ko", nativeLabel: "한국어", englishLabel: "Korean" },
  { code: "es", nativeLabel: "Español", englishLabel: "Spanish" },
  { code: "pt", nativeLabel: "Português", englishLabel: "Portuguese" },
  { code: "fr", nativeLabel: "Français", englishLabel: "French" },
  { code: "de", nativeLabel: "Deutsch", englishLabel: "German" },
] as const;

const LANGUAGE_CODES = new Set<LanguageCode>(LANGUAGE_OPTIONS.map((option) => option.code));

export const DEFAULT_LANGUAGE_SETTINGS: LanguageSettings = {
  targetLanguage: "en",
  nativeLanguage: "zh-CN",
};

export function defaultLanguageSettingsForBrowser(): LanguageSettings {
  if (typeof navigator === "undefined") return DEFAULT_LANGUAGE_SETTINGS;
  const browserCode = navigator.language.toLowerCase();
  const nativeLanguage = LANGUAGE_OPTIONS.find((option) => (
    browserCode === option.code.toLowerCase()
    || browserCode.startsWith(`${option.code.toLowerCase()}-`)
    || option.code.toLowerCase().startsWith(`${browserCode}-`)
  ))?.code || "en";
  return { targetLanguage: "en", nativeLanguage };
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return typeof value === "string" && LANGUAGE_CODES.has(value as LanguageCode);
}

export function normalizeLanguageSettings(input: Partial<LanguageSettings> | null | undefined): LanguageSettings {
  return {
    targetLanguage: isLanguageCode(input?.targetLanguage)
      ? input.targetLanguage
      : DEFAULT_LANGUAGE_SETTINGS.targetLanguage,
    nativeLanguage: isLanguageCode(input?.nativeLanguage)
      ? input.nativeLanguage
      : DEFAULT_LANGUAGE_SETTINGS.nativeLanguage,
  };
}

export function languageOption(code: LanguageCode) {
  return LANGUAGE_OPTIONS.find((option) => option.code === code) || LANGUAGE_OPTIONS[0];
}

export function languageSummary(settings: LanguageSettings) {
  return `${languageOption(settings.targetLanguage).nativeLabel} / ${languageOption(settings.nativeLanguage).nativeLabel}`;
}

export function languageNameInEnglish(code: LanguageCode) {
  return languageOption(code).englishLabel;
}


