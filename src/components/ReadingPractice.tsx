import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { ArrowLeft, BookOpenCheck, CheckCircle2, Clock3, Eye, RotateCcw, Send, XCircle } from "lucide-react";
import { loadObjectiveAttempts, objectiveAttemptsForSkill, saveObjectiveAttempts } from "../practice/objectiveHistory";
import { isObjectiveAnswerCorrect, objectiveBand, objectiveStudyCards } from "../practice/objectiveScoring";
import { clearObjectiveDraft, loadObjectiveDraft, saveObjectiveDraft } from "../practice/objectiveDraft";
import { READING_PASSAGES, READING_QUESTIONS } from "../practice/readingTests";
import type { ObjectiveAttempt, ObjectivePracticeSkill, SpeakingStudyCard } from "../shared/practiceTypes";
import { ObjectiveHistory } from "./ObjectiveHistory";
import { ObjectiveQuestionField } from "./ObjectiveQuestionField";

interface ReadingPracticeProps {
  ownerId: string;
  historyRevision?: number;
  onExit: () => void;
  onSaveStudyCards: (cards: SpeakingStudyCard[], context: { skill: ObjectivePracticeSkill }) => Promise<void> | void;
  onAttemptSaved?: (attempt: ObjectiveAttempt) => Promise<void> | void;
  onHistoryCleared?: () => Promise<void> | void;
}

const TEST_SECONDS = 60 * 60;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function ReadingPractice({ ownerId, historyRevision, onExit, onSaveStudyCards, onAttemptSaved, onHistoryCleared }: ReadingPracticeProps) {
  const [phase, setPhase] = useState<"intro" | "active" | "result">("intro");
  const [passageIndex, setPassageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_SECONDS);
  const [startedAt, setStartedAt] = useState(0);
  const [attempts, setAttempts] = useState<ObjectiveAttempt[]>(() => loadObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  const [currentAttempt, setCurrentAttempt] = useState<ObjectiveAttempt | null>(null);
  const [studySaveStatus, setStudySaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [savedDraft, setSavedDraft] = useState(() => loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "reading"));
  const readingAttempts = useMemo(() => objectiveAttemptsForSkill(attempts, "reading"), [attempts]);

  useEffect(() => {
    setAttempts(loadObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
    setSavedDraft(loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "reading"));
  }, [historyRevision, ownerId]);

  const startTest = useCallback(() => {
    clearObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "reading");
    setSavedDraft(null);
    setAnswers({});
    setPassageIndex(0);
    setRemainingSeconds(TEST_SECONDS);
    setStartedAt(Date.now());
    setCurrentAttempt(null);
    setStudySaveStatus("idle");
    setPhase("active");
  }, [ownerId]);

  const resumeTest = useCallback(() => {
    const draft = loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "reading");
    if (!draft) return;
    setAnswers(draft.answers);
    setPassageIndex(Math.min(READING_PASSAGES.length - 1, draft.sectionIndex));
    setRemainingSeconds(draft.remainingSeconds);
    setStartedAt(Date.now() - (TEST_SECONDS - draft.remainingSeconds) * 1000);
    setCurrentAttempt(null);
    setStudySaveStatus("idle");
    setPhase("active");
  }, [ownerId]);

  const finishTest = useCallback(() => {
    if (phase !== "active") return;
    const correct = READING_QUESTIONS.filter((question) => isObjectiveAnswerCorrect(question, answers[question.id] || "")).length;
    const attempt: ObjectiveAttempt = {
      id: nanoid(),
      skill: "reading",
      createdAt: Date.now(),
      correct,
      total: READING_QUESTIONS.length,
      estimatedBand: objectiveBand("reading", correct),
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      sectionScores: READING_PASSAGES.map((passage) => passage.questions.filter((question) => isObjectiveAnswerCorrect(question, answers[question.id] || "")).length),
      answers,
      wrongQuestionIds: READING_QUESTIONS.filter((question) => !isObjectiveAnswerCorrect(question, answers[question.id] || "")).map((question) => question.id),
    };
    setAttempts((existing) => saveObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId, [attempt, ...existing]));
    setCurrentAttempt(attempt);
    setPhase("result");
    clearObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "reading");
    setSavedDraft(null);
    Promise.resolve(onAttemptSaved?.(attempt)).catch((historyError) => console.error("Failed to sync reading attempt:", historyError));
    const cards = objectiveStudyCards("reading", READING_QUESTIONS, answers);
    if (cards.length) {
      setStudySaveStatus("saving");
      Promise.resolve(onSaveStudyCards(cards, { skill: "reading" }))
        .then(() => setStudySaveStatus("saved"))
        .catch(() => setStudySaveStatus("failed"));
    }
  }, [answers, onAttemptSaved, onSaveStudyCards, ownerId, phase, startedAt]);

  useEffect(() => {
    if (phase !== "active") return;
    saveObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, {
      skill: "reading",
      answers,
      sectionIndex: passageIndex,
      remainingSeconds,
      startedAt,
      updatedAt: Date.now(),
      playedSectionIds: [],
    });
  }, [answers, ownerId, passageIndex, phase, remainingSeconds, startedAt]);

  useEffect(() => {
    if (phase !== "active") return;
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "active" && remainingSeconds === 0) finishTest();
  }, [finishTest, phase, remainingSeconds]);

  const clearHistory = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear locally saved Reading history?")) return;
    setAttempts((existing) => saveObjectiveAttempts(window.localStorage, ownerId, existing.filter((attempt) => attempt.skill !== "reading")));
    Promise.resolve(onHistoryCleared?.()).catch((historyError) => console.error("Failed to clear cloud reading history:", historyError));
  };

  if (phase === "intro") {
    return (
      <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
        <div className="mx-auto my-auto w-full max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <button type="button" onClick={onExit} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> Practice home</button>
            <p className="text-xs font-bold uppercase tracking-widest text-[#267066] dark:text-[#9ddad0]">IELTS Academic Reading</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-[#2E2A27] dark:text-white sm:text-4xl">Read for the claim, not the keyword.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">A full original test with three passages and forty questions. Every review points back to the exact sentence that decides the answer.</p>
            <div className="mt-8 grid grid-cols-3 border-y border-[#E8E2D6] dark:border-[#3a2347]">
              {[['3', 'passages'], ['40', 'questions'], ['60', 'minutes']].map(([value, label], index) => <div key={label} className={`py-5 text-center ${index ? "border-l border-[#E8E2D6] dark:border-[#3a2347]" : ""}`}><strong className="block text-2xl text-[#2E2A27] dark:text-white">{value}</strong><span className="text-xs uppercase text-[#8B817A] dark:text-[#a58ebd]">{label}</span></div>)}
            </div>
            <button type="button" onClick={startTest} className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-[#173F39] px-5 text-sm font-bold text-white hover:bg-[#22594f] dark:bg-[#f2d276] dark:text-[#2c2430]"><BookOpenCheck size={18} /> Start full test</button>
            {savedDraft ? <button type="button" onClick={resumeTest} className="ml-3 mt-7 inline-flex h-12 items-center gap-2 rounded-lg border border-[#B8D4CE] px-5 text-sm font-bold text-[#285F57] hover:bg-[#EAF5F2] dark:border-[#2e5661] dark:text-[#a9ddd3]"><RotateCcw size={17} /> Resume · {formatTime(savedDraft.remainingSeconds)}</button> : null}
            <p className="mt-4 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">Original Hina practice material. Raw scores use common Academic Reading conversion ranges and are not official IELTS results.</p>
            <ObjectiveHistory skill="reading" attempts={readingAttempts} onRestart={startTest} onClear={clearHistory} />
          </motion.div>
        </div>
      </main>
    );
  }

  if (phase === "result" && currentAttempt) {
    const wrongQuestions = READING_QUESTIONS.filter((question) => currentAttempt.wrongQuestionIds.includes(question.id));
    return (
      <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <button type="button" onClick={() => setPhase("intro")} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> Reading home</button>
          <div className="grid gap-6 border-y border-[#E8E2D6] py-7 dark:border-[#3a2347] md:grid-cols-[1fr_1.3fr]">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#267066] dark:text-[#9ddad0]">Practice estimate</p><p className="mt-2 text-6xl font-semibold text-[#225C53] dark:text-[#9ddad0]">{currentAttempt.estimatedBand.toFixed(1)}</p><p className="mt-2 text-sm text-[#756B65] dark:text-[#bda9ca]">{currentAttempt.correct} correct out of {currentAttempt.total}</p></div>
            <div className="grid grid-cols-3 divide-x divide-[#E8E2D6] border border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">{currentAttempt.sectionScores.map((score, index) => <div key={index} className="p-4"><span className="text-xs text-[#8B817A] dark:text-[#a58ebd]">Passage {index + 1}</span><strong className="mt-2 block text-xl text-[#34302D] dark:text-white">{score}/{READING_PASSAGES[index].questions.length}</strong></div>)}</div>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-[#332E2A] dark:text-white">Evidence review</h3><p className="mt-1 text-sm text-[#7C746F] dark:text-[#bda9ca]">{wrongQuestions.length ? `${wrongQuestions.length} answers need another look.` : "A clean sweep. Every answer is supported by the passage."}</p></div><button type="button" onClick={startTest} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D9CFC0] px-4 text-sm font-bold text-[#554D48] hover:bg-white dark:border-[#4a3656] dark:text-[#dbcde2]"><RotateCcw size={16} /> Try again</button></div>
          {studySaveStatus !== "idle" && <p className="mt-3 text-xs text-[#837970] dark:text-[#a58ebd]">{studySaveStatus === "saving" ? "Saving review cards to Study…" : studySaveStatus === "saved" ? "The first five missed answers were saved to Study." : "Study cards could not be saved, but this result remains in local history."}</p>}
          <div className="mt-5 space-y-3">
            {wrongQuestions.map((question) => <article key={question.id} className="rounded-lg border border-[#E7DED1] bg-white p-4 dark:border-[#402c4c] dark:bg-[#25192e]"><div className="flex gap-3"><XCircle size={19} className="mt-0.5 shrink-0 text-[#B85C4D]" /><div><h4 className="text-sm font-bold text-[#3B3531] dark:text-white">Q{question.number}. {question.prompt}</h4><p className="mt-2 text-sm text-[#8A5145] dark:text-[#e7a28f]">Your answer: {answers[question.id] || "No answer"}</p><p className="mt-1 text-sm font-semibold text-[#23685E] dark:text-[#9ddad0]">Correct: {question.acceptedAnswers[0]}</p><p className="mt-3 flex gap-2 text-sm leading-6 text-[#69615C] dark:text-[#c5b5ce]"><Eye size={16} className="mt-1 shrink-0" /> “{question.evidence}”</p><p className="mt-1 text-xs leading-5 text-[#91877F] dark:text-[#9d8aaa]">{question.explanation}</p></div></div></article>)}
            {!wrongQuestions.length && <div className="flex items-center gap-3 rounded-lg border border-[#BFDCD6] bg-[#EAF5F2] p-4 text-sm font-semibold text-[#285F57] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]"><CheckCircle2 size={20} /> All forty answers are correct.</div>}
          </div>
        </div>
      </main>
    );
  }

  const passage = READING_PASSAGES[passageIndex];
  const answeredCount = Object.values(answers).filter((answer) => String(answer).trim()).length;
  return (
    <main className="flex min-h-0 flex-1 flex-col bg-[#FDFBF7] dark:bg-[#1c1224]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#E8E2D6] px-4 py-3 dark:border-[#3a2347] sm:px-7"><button type="button" onClick={() => { setSavedDraft(loadObjectiveDraft(window.localStorage, ownerId, "reading")); setPhase("intro"); }} className="flex items-center gap-2 text-sm font-semibold text-[#746B66] dark:text-[#bda9ca]"><ArrowLeft size={17} /> Save & exit</button><div className="ml-auto flex items-center gap-2 text-sm font-bold text-[#3E3834] dark:text-white"><Clock3 size={17} /> {formatTime(remainingSeconds)}</div><button type="button" onClick={finishTest} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#173F39] px-3 text-xs font-bold text-white dark:bg-[#f2d276] dark:text-[#2c2430]"><Send size={14} /> Submit</button></header>
      <nav className="flex shrink-0 overflow-x-auto border-b border-[#E8E2D6] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-[#3a2347] sm:px-7">{READING_PASSAGES.map((item, index) => { const count = item.questions.filter((question) => answers[question.id]?.trim()).length; return <button type="button" key={item.id} onClick={() => setPassageIndex(index)} className={`min-w-max border-b-2 px-4 py-3 text-xs font-bold ${index === passageIndex ? "border-[#D18B22] text-[#7B551C] dark:text-[#f3d887]" : "border-transparent text-[#887D75] dark:text-[#9d8aaa]"}`}>Passage {index + 1} · {count}/{item.questions.length}</button>; })}<span className="ml-auto min-w-max self-center pl-4 text-xs text-[#91877F] dark:text-[#9d8aaa]">{answeredCount}/40 answered</span></nav>
      <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-2 lg:overflow-hidden">
        <article className="border-b border-[#E8E2D6] px-5 py-7 dark:border-[#3a2347] lg:overflow-y-auto lg:border-b-0 lg:border-r sm:px-8"><p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">{passage.subtitle}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#2E2A27] dark:text-white">{passage.title}</h2><div className="mt-6 space-y-5">{passage.paragraphs.map((paragraph) => <div key={paragraph.label} className="grid grid-cols-[24px_1fr] gap-3"><strong className="text-sm text-[#A16E28] dark:text-[#d6bdec]">{paragraph.label}</strong><p className="text-[15px] leading-7 text-[#514B47] dark:text-[#d5c8dc]">{paragraph.text}</p></div>)}</div></article>
        <section className="px-5 py-7 lg:overflow-y-auto sm:px-8"><div className="space-y-8">{passage.questions.map((question) => <ObjectiveQuestionField key={question.id} question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />)}</div><div className="mt-10 flex justify-between border-t border-[#E8E2D6] pt-5 dark:border-[#3a2347]"><button type="button" disabled={passageIndex === 0} onClick={() => setPassageIndex((index) => index - 1)} className="h-10 rounded-lg border border-[#DED5C7] px-4 text-sm font-bold text-[#635B55] disabled:opacity-30 dark:border-[#4a3656] dark:text-[#cbbbd3]">Previous</button>{passageIndex < 2 ? <button type="button" onClick={() => setPassageIndex((index) => index + 1)} className="h-10 rounded-lg bg-[#EAF5F2] px-4 text-sm font-bold text-[#285F57] dark:bg-[#17303a] dark:text-[#a9ddd3]">Next passage</button> : <button type="button" onClick={finishTest} className="h-10 rounded-lg bg-[#173F39] px-4 text-sm font-bold text-white dark:bg-[#f2d276] dark:text-[#2c2430]">Submit test</button>}</div></section>
      </div>
    </main>
  );
}


