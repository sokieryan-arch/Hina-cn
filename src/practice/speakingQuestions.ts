import type { SpeakingPart, SpeakingQuestion } from "../shared/practiceTypes";

export const SPEAKING_QUESTIONS: SpeakingQuestion[] = [
  {
    id: "part1-daily-rhythm",
    part: 1,
    eyebrow: "Daily life",
    question: "What part of your day do you usually enjoy the most?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 45,
  },
  {
    id: "part1-week-plans",
    part: 1,
    eyebrow: "Plans",
    question: "Do you prefer planning your week or deciding things as you go?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 45,
  },
  {
    id: "part1-small-habit",
    part: 1,
    eyebrow: "Habits",
    question: "Is there a small habit you would like to change?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 45,
  },
  {
    id: "part2-city-place",
    part: 2,
    eyebrow: "Long turn",
    question: "Describe a small place in your city where you like to spend time.",
    cues: [
      "where it is",
      "when you usually go there",
      "what you do there",
      "and explain why this place matters to you",
    ],
    prepSeconds: 60,
    answerSeconds: 120,
  },
  {
    id: "part2-new-skill",
    part: 2,
    eyebrow: "Long turn",
    question: "Describe a skill you learned that was more difficult than you expected.",
    cues: [
      "what the skill was",
      "why you decided to learn it",
      "how you learned it",
      "and explain how you felt when you improved",
    ],
    prepSeconds: 60,
    answerSeconds: 120,
  },
  {
    id: "part3-public-spaces",
    part: 3,
    eyebrow: "Discussion",
    question: "Why do people need places where they can spend time away from home and work?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 75,
  },
  {
    id: "part3-changing-cities",
    part: 3,
    eyebrow: "Discussion",
    question: "How have public spaces in cities changed in recent years?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 75,
  },
  {
    id: "part3-government-spending",
    part: 3,
    eyebrow: "Discussion",
    question: "Should governments spend more money on quiet public spaces?",
    cues: [],
    prepSeconds: 0,
    answerSeconds: 75,
  },
];

export function speakingQuestionsForPart(part: SpeakingPart) {
  return SPEAKING_QUESTIONS.filter((question) => question.part === part);
}

export function findSpeakingQuestion(questionId: string) {
  return SPEAKING_QUESTIONS.find((question) => question.id === questionId) || null;
}


