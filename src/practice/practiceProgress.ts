import type { ObjectiveAttempt, PracticeHistoryRecord, PracticeSkill, SpeakingAttempt, WritingAttempt } from "../shared/practiceTypes";

export const PRACTICE_SKILLS: PracticeSkill[] = ["listening", "reading", "writing", "speaking"];

export const PRACTICE_SKILL_LABELS: Record<PracticeSkill, string> = {
  listening: "Listening",
  reading: "Reading",
  writing: "Writing",
  speaking: "Speaking",
};

export interface PracticeSkillSummary {
  skill: PracticeSkill;
  latestBand: number | null;
  previousBand: number | null;
  trend: number | null;
  attempts: number;
  lastPracticedAt: number | null;
  weakness: string;
}

function rounded(value: number) {
  return Math.round(value * 10) / 10;
}

function weaknessForRecord(record: PracticeHistoryRecord | undefined) {
  if (!record) return "No evidence yet";
  if (record.skill === "speaking") {
    const scores = (record.attempt as SpeakingAttempt).scores;
    const criteria = [
      ["Fluency", scores.fluency],
      ["Vocabulary", scores.lexicalResource],
      ["Grammar", scores.grammar],
      ["Pronunciation", scores.pronunciation],
    ] as const;
    return criteria.reduce((weakest, current) => current[1] < weakest[1] ? current : weakest)[0];
  }
  if (record.skill === "writing") {
    const scores = (record.attempt as WritingAttempt).scores;
    const criteria = [
      ["Task response", scores.taskResponse],
      ["Coherence", scores.coherence],
      ["Vocabulary", scores.lexicalResource],
      ["Grammar", scores.grammar],
    ] as const;
    return criteria.reduce((weakest, current) => current[1] < weakest[1] ? current : weakest)[0];
  }
  const attempt = record.attempt as ObjectiveAttempt;
  if (!attempt.sectionScores.length) return "Section accuracy";
  const sectionTotals = record.skill === "reading" ? [13, 13, 14] : [10, 10, 10, 10];
  const weakestIndex = attempt.sectionScores.reduce((index, score, currentIndex, scores) => {
    const currentRatio = score / (sectionTotals[currentIndex] || 1);
    const weakestRatio = scores[index] / (sectionTotals[index] || 1);
    return currentRatio < weakestRatio ? currentIndex : index;
  }, 0);
  return record.skill === "reading" ? `Passage ${weakestIndex + 1}` : `Section ${weakestIndex + 1}`;
}

export function buildPracticeSummaries(records: PracticeHistoryRecord[]): PracticeSkillSummary[] {
  return PRACTICE_SKILLS.map((skill) => {
    const attempts = records.filter((record) => record.skill === skill).sort((left, right) => right.createdAt - left.createdAt);
    const latestBand = attempts[0]?.attempt.estimatedBand ?? null;
    const previousBand = attempts[1]?.attempt.estimatedBand ?? null;
    return {
      skill,
      latestBand,
      previousBand,
      trend: latestBand !== null && previousBand !== null ? rounded(latestBand - previousBand) : null,
      attempts: attempts.length,
      lastPracticedAt: attempts[0]?.createdAt ?? null,
      weakness: weaknessForRecord(attempts[0]),
    };
  });
}

export function overallPracticeBand(summaries: PracticeSkillSummary[]) {
  const scores = summaries.flatMap((summary) => summary.latestBand === null ? [] : [summary.latestBand]);
  return scores.length ? rounded(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null;
}

export function recommendNextPractice(summaries: PracticeSkillSummary[]) {
  const missing = summaries.find((summary) => summary.latestBand === null);
  if (missing) {
    return {
      skill: missing.skill,
      reason: `Complete your first ${PRACTICE_SKILL_LABELS[missing.skill]} attempt to finish the four-skill baseline.`,
    };
  }
  const recommended = [...summaries].sort((left, right) => {
    if ((left.latestBand ?? 0) !== (right.latestBand ?? 0)) return (left.latestBand ?? 0) - (right.latestBand ?? 0);
    return (left.lastPracticedAt ?? 0) - (right.lastPracticedAt ?? 0);
  })[0];
  return {
    skill: recommended.skill,
    reason: `${PRACTICE_SKILL_LABELS[recommended.skill]} is currently your lowest band. Focus next on ${recommended.weakness.toLowerCase()}.`,
  };
}


