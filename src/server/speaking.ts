import { isLanguageCode, languageNameInEnglish } from "../i18n/languages.js";
import { findSpeakingQuestion } from "../practice/speakingQuestions.js";
import type { LanguageCode, SpeakingEvaluation, SpeakingEvaluationInput, SpeakingPart, SpeakingScores, SpeakingStudyCard, SpeakingStudyCardKind } from "../shared/practiceTypes.js";

const ALLOWED_AUDIO_TYPES = new Set([
  "audio/mp4",
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
]);

const MAX_AUDIO_BASE64_LENGTH = 3_600_000;

export interface ValidatedSpeakingEvaluationInput extends SpeakingEvaluationInput {
  nativeLanguage: LanguageCode;
}

function invalid(message: string): never {
  const error = new Error(message) as Error & { status?: number };
  error.status = 400;
  throw error;
}

export function readSpeakingEvaluationInput(input: unknown): ValidatedSpeakingEvaluationInput {
  if (!input || typeof input !== "object") invalid("Invalid speaking evaluation request.");
  const candidate = input as Partial<SpeakingEvaluationInput>;
  const questionId = typeof candidate.questionId === "string" ? candidate.questionId.trim() : "";
  const audioBase64 = typeof candidate.audioBase64 === "string" ? candidate.audioBase64.trim() : "";
  const mimeType = typeof candidate.mimeType === "string"
    ? candidate.mimeType.split(";")[0].trim().toLowerCase()
    : "";

  if (!findSpeakingQuestion(questionId)) invalid("Unknown speaking question.");
  if (!ALLOWED_AUDIO_TYPES.has(mimeType)) invalid("Unsupported audio format.");
  if (!audioBase64 || audioBase64.length > MAX_AUDIO_BASE64_LENGTH || !/^[a-zA-Z0-9+/=]+$/.test(audioBase64)) {
    invalid("Audio recording is missing or too large.");
  }

  return {
    questionId,
    audioBase64,
    mimeType,
    nativeLanguage: isLanguageCode(candidate.nativeLanguage) ? candidate.nativeLanguage : "zh-CN",
  };
}

export function buildSpeakingEvaluationPrompt(input: ValidatedSpeakingEvaluationInput) {
  const question = findSpeakingQuestion(input.questionId);
  if (!question) throw new Error("Speaking question disappeared after validation.");
  const nativeLanguage = languageNameInEnglish(input.nativeLanguage);
  const cueText = question.cues.length > 0 ? `\nCue points:\n- ${question.cues.join("\n- ")}` : "";

  return `You are Hina acting as a supportive IELTS Speaking practice evaluator, not an official IELTS examiner.
Listen carefully to the attached audio and evaluate only what is actually audible.

Practice prompt (Part ${question.part}):
${question.question}${cueText}

Output contract:
- Work in this order: first transcribe the complete response, then score only the language evidenced by that transcript and the attached audio.
- Transcribe faithfully in English. Preserve fillers, repetitions, false starts, unfinished sentences, and grammatical errors. Mark substantial silence as [long pause]. Never rewrite the learner's words in the transcript.
- Give conservative half-band estimates from 0 to 9 for fluency and coherence, lexical resource, grammatical range and accuracy, and pronunciation.
- Apply a burden-of-proof rule: do not award 6.0 or above for a criterion unless the recording clearly demonstrates the relevant IELTS band descriptor. Simple but correct language alone is not evidence of lexical or grammatical range.
- Long pauses, abandoned answers, very short responses, repetition, and off-topic material must lower fluency and may limit how confidently all four criteria can be scored.
- Do not infer ideas, vocabulary, grammar, or pronunciation features that are not actually present. Do not reward unused recording time.
- estimatedBand is the average impression, rounded to the nearest half band.
- Explain summary, strengths, priorities, and studyNote in ${nativeLanguage}.
- Every strength must use this exact format: Evidence: "exact words copied from the transcript" — explanation. If there is no exact supporting quote of at least two words, do not include that strength.
- Keep improvedAnswer in natural English and preserve the speaker's original ideas rather than inventing a completely different story.
- studyNote must be a compact reusable learning card with a short heading and 2-4 practical points.
- Return exactly four studyCards, one for each kind: grammar, vocabulary, expression, and pronunciation.
- Each study card needs a short title and a compact body in ${nativeLanguage}. Keep English examples in English.
- Make every card specific to something audible in this answer. If one category was already strong, turn that card into a reusable strength reminder.
- If the recording is silent or unintelligible, use a transcript that says so, keep scores low, and explain how to retry.
- Never describe this result as an official IELTS score.`;
}

function halfBand(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(9, Math.round(parsed * 2) / 2));
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function textList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 4)
    : [];
}

function normalizeEvidenceText(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}'’-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptWordCount(transcript: string) {
  if (/no clear speech|no intelligible speech|\[silence\]|\[inaudible\]/i.test(transcript)) return 0;
  return transcript.match(/[A-Za-z]+(?:['’-][A-Za-z]+)*/g)?.length || 0;
}

function evidenceBackedStrengths(value: unknown, transcript: string) {
  const normalizedTranscript = normalizeEvidenceText(transcript);
  return textList(value).filter((item) => {
    const quotes = [...item.matchAll(/["“]([^"”]+)["”]/g)].map((match) => match[1]);
    return quotes.some((quote) => {
      const normalizedQuote = normalizeEvidenceText(quote);
      const quoteWords = normalizedQuote.split(" ").filter(Boolean);
      return quoteWords.length >= 2 && normalizedTranscript.includes(normalizedQuote);
    });
  });
}

export function speakingScoreCeiling(part: SpeakingPart, wordCount: number) {
  const thresholds: Record<SpeakingPart, Array<[number, number]>> = {
    1: [[1, 0], [4, 2], [10, 4], [20, 5], [30, 5.5]],
    2: [[1, 0], [5, 2], [25, 4], [50, 5], [90, 5.5]],
    3: [[1, 0], [5, 2], [15, 4], [30, 5], [45, 5.5]],
  };
  return thresholds[part].find(([minimum]) => wordCount < minimum)?.[1] ?? null;
}

function evidenceConfidence(part: SpeakingPart, wordCount: number, scoreCeiling: number | null) {
  if (scoreCeiling !== null) return "low" as const;
  const highEvidenceWords: Record<SpeakingPart, number> = { 1: 50, 2: 140, 3: 70 };
  return wordCount >= highEvidenceWords[part] ? "high" as const : "medium" as const;
}

function evidenceLimitedSummary(language: LanguageCode, wordCount: number, scoreCeiling: number) {
  const ceiling = scoreCeiling.toFixed(1);
  const summaries: Record<LanguageCode, string> = {
    en: `Only ${wordCount} English words were transcribed, so there is not enough evidence for a confident higher-band judgment. This practice estimate is capped at ${ceiling}; check the transcript below first.`,
    "zh-CN": `本次录音只转写出 ${wordCount} 个英文词，可用于判断的语言证据不足，因此练习估分最高限制为 ${ceiling}。请先核对下方转写。`,
    ja: `文字起こしできた英単語は ${wordCount} 語のみで、高いバンドを判断するには証拠が不足しています。今回の練習推定は ${ceiling} が上限です。まず下の文字起こしを確認してください。`,
    ko: `전사된 영어 단어가 ${wordCount}개뿐이라 높은 밴드를 판단할 근거가 부족합니다. 이번 연습 추정 점수는 최대 ${ceiling}로 제한됩니다. 먼저 아래 전사를 확인해 주세요.`,
    es: `Solo se transcribieron ${wordCount} palabras en inglés, así que no hay evidencia suficiente para una estimación alta fiable. La puntuación máxima de esta práctica es ${ceiling}; revisa primero la transcripción.`,
    pt: `Apenas ${wordCount} palavras em inglês foram transcritas, por isso não há evidência suficiente para uma estimativa alta confiável. A nota desta prática fica limitada a ${ceiling}; confira primeiro a transcrição.`,
    fr: `Seulement ${wordCount} mots anglais ont été transcrits, ce qui ne suffit pas pour une estimation fiable à un niveau supérieur. Cette estimation est plafonnée à ${ceiling} ; vérifiez d'abord la transcription.`,
    de: `Es wurden nur ${wordCount} englische Wörter transkribiert. Das reicht nicht für eine verlässliche höhere Einstufung. Diese Übungsschätzung ist auf ${ceiling} begrenzt; prüfe zuerst das Transkript.`,
  };
  return summaries[language];
}

const STUDY_CARD_KINDS: SpeakingStudyCardKind[] = ["grammar", "vocabulary", "expression", "pronunciation"];

function studyCards(value: unknown, fallback: string): SpeakingStudyCard[] {
  const cards = Array.isArray(value)
    ? value.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const card = item as Record<string, unknown>;
      const kind = STUDY_CARD_KINDS.find((candidate) => candidate === card.kind);
      const title = text(card.title);
      const body = text(card.body);
      return kind && title && body ? [{ kind, title, body }] : [];
    })
    : [];
  const byKind = new Map(cards.map((card) => [card.kind, card]));
  return STUDY_CARD_KINDS.map((kind) => byKind.get(kind) || {
    kind,
    title: `${kind[0].toUpperCase()}${kind.slice(1)} focus`,
    body: fallback || "Review this part of the answer before the next attempt.",
  });
}

export function normalizeSpeakingEvaluation(
  input: unknown,
  context: { part?: SpeakingPart; nativeLanguage?: LanguageCode } = {},
): SpeakingEvaluation {
  const data = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const rawScores = data.scores && typeof data.scores === "object" ? data.scores as Record<string, unknown> : {};
  const transcript = text(data.transcript, "No clear speech was detected.");
  const wordCount = transcriptWordCount(transcript);
  const part = context.part || 1;
  const scoreCeiling = speakingScoreCeiling(part, wordCount);
  const cap = (value: unknown) => {
    const score = halfBand(value);
    return scoreCeiling === null ? score : Math.min(score, scoreCeiling);
  };
  const scores: SpeakingScores = {
    fluency: cap(rawScores.fluency),
    lexicalResource: cap(rawScores.lexicalResource),
    grammar: cap(rawScores.grammar),
    pronunciation: cap(rawScores.pronunciation),
  };
  const scoreAverage = Object.values(scores).reduce((sum, score) => sum + score, 0) / 4;
  const estimatedBand = halfBand(scoreAverage);

  const studyNote = text(data.studyNote);
  return {
    transcript,
    summary: scoreCeiling === null
      ? text(data.summary, "Hina could not produce a full evaluation for this recording.")
      : evidenceLimitedSummary(context.nativeLanguage || "en", wordCount, scoreCeiling),
    estimatedBand,
    scores,
    strengths: evidenceBackedStrengths(data.strengths, transcript),
    priorities: textList(data.priorities),
    improvedAnswer: text(data.improvedAnswer),
    studyNote,
    studyCards: studyCards(data.studyCards, studyNote),
    evidence: {
      transcribedWordCount: wordCount,
      scoreCeiling,
      confidence: evidenceConfidence(part, wordCount, scoreCeiling),
    },
  };
}


