export type Role = "user" | "model";
export type MessageType = "response" | "correction" | "insight" | "tip" | "proactive";

export interface Message {
  id: string;
  role: Role;
  text: string;
  isTyping?: boolean;
  type?: MessageType;
  tipKind?: "correction" | "expression" | "culture";
  timestamp: number;
}

export interface ProactiveSettings {
  enabled: boolean;
  minHoursBetweenNudges: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  favoriteTopics: string[];
}

export type LanguageCode = "en" | "zh-CN" | "ja" | "ko" | "es" | "pt" | "fr" | "de";

export interface LanguageSettings {
  targetLanguage: LanguageCode;
  nativeLanguage: LanguageCode;
}

export interface UserProfile {
  displayName: string;
  photoURL: string | null;
}

export interface BillingSummary {
  plan: "free" | "pro";
  isPro: boolean;
  dailyLimit: number | null;
  usedToday: number;
  remainingToday: number | null;
  resetAt: string;
}

export type HinaSpaceView = "space" | "practice" | "moments" | "notes" | "wishlist" | "relationship";
export type AppView = "chat" | HinaSpaceView;
export type WishlistKind = "goal" | "hook" | "place" | "note";

export type SpeakingPart = 1 | 2 | 3;

export interface SpeakingQuestion {
  id: string;
  part: SpeakingPart;
  eyebrow: string;
  question: string;
  cues: string[];
  prepSeconds: number;
  answerSeconds: number;
}

export interface SpeakingScores {
  fluency: number;
  lexicalResource: number;
  grammar: number;
  pronunciation: number;
}

export type SpeakingStudyCardKind = "grammar" | "vocabulary" | "expression" | "pronunciation";

export interface SpeakingStudyCard {
  kind: SpeakingStudyCardKind;
  title: string;
  body: string;
}

export interface SpeakingEvidence {
  transcribedWordCount: number;
  scoreCeiling: number | null;
  confidence: "low" | "medium" | "high";
}

export interface SpeakingEvaluation {
  transcript: string;
  summary: string;
  estimatedBand: number;
  scores: SpeakingScores;
  strengths: string[];
  priorities: string[];
  improvedAnswer: string;
  studyNote: string;
  studyCards: SpeakingStudyCard[];
  evidence: SpeakingEvidence;
}

export interface SpeakingEvaluationInput {
  questionId: string;
  audioBase64: string;
  mimeType: string;
  nativeLanguage: LanguageCode;
}

export interface SpeakingAttempt {
  id: string;
  questionId: string;
  question: string;
  part: SpeakingPart;
  createdAt: number;
  estimatedBand: number;
  scores: SpeakingScores;
  transcript: string;
  summary: string;
  priorities: string[];
  improvedAnswer: string;
  studyCards: SpeakingStudyCard[];
}

export type WritingTaskType = "task1" | "task2";

interface WritingPromptBase {
  id: string;
  topic: string;
  question: string;
  taskType: WritingTaskType;
  minimumWords: number;
  durationMinutes: number;
}

export interface WritingChartSeries {
  name: string;
  values: number[];
}

export type WritingTask1Visual =
  | {
    kind: "line" | "bar";
    title: string;
    unit: string;
    labels: string[];
    series: WritingChartSeries[];
  }
  | {
    kind: "pie";
    title: string;
    sets: Array<{ label: string; values: Array<{ name: string; value: number }> }>;
  }
  | {
    kind: "table";
    title: string;
    columns: string[];
    rows: Array<{ label: string; values: number[] }>;
    unit: string;
  }
  | {
    kind: "map";
    title: string;
    panels: Array<{
      label: string;
      features: Array<{ label: string; x: number; y: number; width: number; height: number; tone: "green" | "blue" | "amber" | "rose" | "neutral" }>;
    }>;
  }
  | {
    kind: "process";
    title: string;
    steps: Array<{ title: string; detail: string }>;
  };

export interface WritingTask1Prompt extends WritingPromptBase {
  taskType: "task1";
  visual: WritingTask1Visual;
  sourceFacts: string[];
}

export interface WritingTask2Prompt extends WritingPromptBase {
  taskType: "task2";
}

export type WritingPrompt = WritingTask1Prompt | WritingTask2Prompt;

export interface WritingScores {
  taskResponse: number;
  coherence: number;
  lexicalResource: number;
  grammar: number;
}

export interface WritingSentenceFeedback {
  kind: "grammar" | "vocabulary" | "cohesion";
  original: string;
  revision: string;
  reason: string;
}

export interface WritingEvidence {
  wordCount: number;
  scoreCeiling: number | null;
  confidence: "low" | "medium" | "high";
  taskType: WritingTaskType;
  minimumWords: number;
  unsupportedNumbers: string[];
}

export interface WritingEvaluation {
  summary: string;
  estimatedBand: number;
  scores: WritingScores;
  strengths: string[];
  priorities: string[];
  sentenceFeedback: WritingSentenceFeedback[];
  improvedParagraph: string;
  studyCards: SpeakingStudyCard[];
  evidence: WritingEvidence;
}

export interface WritingEvaluationInput {
  questionId: string;
  essay: string;
  nativeLanguage: LanguageCode;
}

export interface WritingAttempt {
  id: string;
  taskType: WritingTaskType;
  questionId: string;
  question: string;
  topic: string;
  createdAt: number;
  essay: string;
  estimatedBand: number;
  scores: WritingScores;
  summary: string;
  priorities: string[];
  sentenceFeedback: WritingSentenceFeedback[];
  improvedParagraph: string;
  studyCards: SpeakingStudyCard[];
}

export type ObjectivePracticeSkill = "reading" | "listening";
export type ObjectiveQuestionKind = "text" | "single";

export interface ObjectiveQuestion {
  id: string;
  number: number;
  kind: ObjectiveQuestionKind;
  prompt: string;
  options?: string[];
  acceptedAnswers: string[];
  evidence: string;
  explanation: string;
}

export interface ReadingPassage {
  id: string;
  title: string;
  subtitle: string;
  paragraphs: Array<{ label: string; text: string }>;
  questions: ObjectiveQuestion[];
}

export interface ListeningSegment {
  speaker: string;
  text: string;
}

export interface ListeningSection {
  id: string;
  title: string;
  context: string;
  segments: ListeningSegment[];
  questions: ObjectiveQuestion[];
}

export interface ObjectiveAttempt {
  id: string;
  skill: ObjectivePracticeSkill;
  createdAt: number;
  correct: number;
  total: number;
  estimatedBand: number;
  durationSeconds: number;
  sectionScores: number[];
  answers: Record<string, string>;
  wrongQuestionIds: string[];
}

export type PracticeSkill = "listening" | "reading" | "writing" | "speaking";
export type PracticeAttempt = ObjectiveAttempt | WritingAttempt | SpeakingAttempt;

export interface PracticeHistoryRecord {
  id: string;
  skill: PracticeSkill;
  createdAt: number;
  attempt: PracticeAttempt;
}

export interface PracticeHistoryResponse {
  records: PracticeHistoryRecord[];
}

export interface WishlistItem {
  id: string;
  kind: WishlistKind;
  title: string;
  details: string | null;
  progress: number;
  completed: boolean;
  targetDate: string | null;
  createdAt: number;
  updatedAt: number;
}


