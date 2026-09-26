import type { ObjectivePracticeSkill, ObjectiveQuestion, SpeakingStudyCard } from "../shared/practiceTypes";

export function normalizeObjectiveAnswer(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^\p{L}\p{N}' ]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isObjectiveAnswerCorrect(question: ObjectiveQuestion, answer: string) {
  const normalized = normalizeObjectiveAnswer(answer);
  return Boolean(normalized) && question.acceptedAnswers.some((candidate) => normalizeObjectiveAnswer(candidate) === normalized);
}

const READING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [33, 7.5], [30, 7], [27, 6.5], [23, 6], [19, 5.5], [15, 5], [13, 4.5], [10, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0],
];
const LISTENING_BANDS: Array<[number, number]> = [
  [39, 9], [37, 8.5], [35, 8], [32, 7.5], [30, 7], [26, 6.5], [23, 6], [18, 5.5], [16, 5], [13, 4.5], [11, 4], [8, 3.5], [6, 3], [4, 2.5], [2, 2], [1, 1], [0, 0],
];

export function objectiveBand(skill: ObjectivePracticeSkill, correct: number, total = 40) {
  const scaled = total > 0 ? Math.round((Math.max(0, Math.min(correct, total)) / total) * 40) : 0;
  const bands = skill === "reading" ? READING_BANDS : LISTENING_BANDS;
  return bands.find(([minimum]) => scaled >= minimum)?.[1] ?? 0;
}

export function objectiveStudyCards(
  skill: ObjectivePracticeSkill,
  questions: ObjectiveQuestion[],
  answers: Record<string, string>,
): SpeakingStudyCard[] {
  return questions
    .filter((question) => !isObjectiveAnswerCorrect(question, answers[question.id] || ""))
    .slice(0, 5)
    .map((question) => ({
      kind: "vocabulary" as const,
      title: `${skill === "reading" ? "Reading" : "Listening"} Q${question.number}: ${question.acceptedAnswers[0]}`,
      body: `Your answer: ${answers[question.id]?.trim() || "No answer"}\nCorrect answer: ${question.acceptedAnswers[0]}\nEvidence: ${question.evidence}\n${question.explanation}`,
    }));
}


