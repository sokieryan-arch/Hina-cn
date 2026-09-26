import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { ArrowLeft, CheckCircle2, Clock3, Headphones, PauseCircle, Play, RotateCcw, Send, Volume2, XCircle } from "lucide-react";
import { LISTENING_QUESTIONS, LISTENING_SECTIONS } from "../practice/listeningTests";
import { loadObjectiveAttempts, objectiveAttemptsForSkill, saveObjectiveAttempts } from "../practice/objectiveHistory";
import { isObjectiveAnswerCorrect, objectiveBand, objectiveStudyCards } from "../practice/objectiveScoring";
import { clearObjectiveDraft, loadObjectiveDraft, saveObjectiveDraft } from "../practice/objectiveDraft";
import type { ObjectiveAttempt, ObjectivePracticeSkill, SpeakingStudyCard } from "../shared/practiceTypes";
import { ObjectiveHistory } from "./ObjectiveHistory";
import { ObjectiveQuestionField } from "./ObjectiveQuestionField";

interface ListeningPracticeProps {
  ownerId: string;
  historyRevision?: number;
  onExit: () => void;
  onSaveStudyCards: (cards: SpeakingStudyCard[], context: { skill: ObjectivePracticeSkill }) => Promise<void> | void;
  onAttemptSaved?: (attempt: ObjectiveAttempt) => Promise<void> | void;
  onHistoryCleared?: () => Promise<void> | void;
}

const TEST_SECONDS = 30 * 60;

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function ListeningPractice({ ownerId, historyRevision, onExit, onSaveStudyCards, onAttemptSaved, onHistoryCleared }: ListeningPracticeProps) {
  const [phase, setPhase] = useState<"intro" | "active" | "result">("intro");
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(TEST_SECONDS);
  const [startedAt, setStartedAt] = useState(0);
  const [playedSections, setPlayedSections] = useState<Set<string>>(new Set());
  const [playingSectionId, setPlayingSectionId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<ObjectiveAttempt[]>(() => loadObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  const [currentAttempt, setCurrentAttempt] = useState<ObjectiveAttempt | null>(null);
  const [studySaveStatus, setStudySaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [savedDraft, setSavedDraft] = useState(() => loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "listening"));
  const playbackToken = useRef(0);
  const listeningAttempts = useMemo(() => objectiveAttemptsForSkill(attempts, "listening"), [attempts]);

  useEffect(() => {
    setAttempts(loadObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
    setSavedDraft(loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "listening"));
  }, [historyRevision, ownerId]);

  const stopSpeech = useCallback(() => {
    playbackToken.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setPlayingSectionId(null);
  }, []);

  useEffect(() => () => {
    playbackToken.current += 1;
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const startTest = useCallback(() => {
    stopSpeech();
    clearObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "listening");
    setSavedDraft(null);
    setAnswers({});
    setSectionIndex(0);
    setRemainingSeconds(TEST_SECONDS);
    setStartedAt(Date.now());
    setPlayedSections(new Set());
    setSpeechError(null);
    setCurrentAttempt(null);
    setStudySaveStatus("idle");
    setPhase("active");
  }, [ownerId, stopSpeech]);

  const resumeTest = useCallback(() => {
    const draft = loadObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "listening");
    if (!draft) return;
    stopSpeech();
    setAnswers(draft.answers);
    setSectionIndex(Math.min(LISTENING_SECTIONS.length - 1, draft.sectionIndex));
    setRemainingSeconds(draft.remainingSeconds);
    setStartedAt(Date.now() - (TEST_SECONDS - draft.remainingSeconds) * 1000);
    setPlayedSections(new Set(draft.playedSectionIds));
    setCurrentAttempt(null);
    setStudySaveStatus("idle");
    setPhase("active");
  }, [ownerId, stopSpeech]);

  const playSection = useCallback((index: number) => {
    const section = LISTENING_SECTIONS[index];
    if (!section || playedSections.has(section.id) || playingSectionId) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechError("This browser cannot play the Listening narration. Try a current version of Chrome, Edge, or Safari.");
      return;
    }
    setSpeechError(null);
    setPlayedSections((current) => new Set(current).add(section.id));
    setPlayingSectionId(section.id);
    const token = ++playbackToken.current;
    const voices = window.speechSynthesis.getVoices().filter((voice) => /^en[-_]/i.test(voice.lang));
    const speakers = Array.from(new Set(section.segments.map((segment) => segment.speaker)));
    let segmentIndex = 0;
    const speakNext = () => {
      if (token !== playbackToken.current) return;
      const segment = section.segments[segmentIndex];
      if (!segment) {
        setPlayingSectionId(null);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(segment.text);
      const voiceIndex = Math.max(0, speakers.indexOf(segment.speaker));
      if (voices.length) utterance.voice = voices[voiceIndex % voices.length];
      utterance.lang = "en-US";
      utterance.rate = 0.91;
      utterance.pitch = voiceIndex % 2 ? 1.05 : 0.96;
      utterance.onend = () => {
        segmentIndex += 1;
        window.setTimeout(speakNext, 260);
      };
      utterance.onerror = (event) => {
        if (event.error !== "canceled" && event.error !== "interrupted") setSpeechError("Playback stopped unexpectedly. This section remains marked as played to preserve test conditions.");
        setPlayingSectionId(null);
      };
      window.speechSynthesis.speak(utterance);
    };
    speakNext();
  }, [playedSections, playingSectionId]);

  const finishTest = useCallback(() => {
    if (phase !== "active") return;
    stopSpeech();
    const correct = LISTENING_QUESTIONS.filter((question) => isObjectiveAnswerCorrect(question, answers[question.id] || "")).length;
    const attempt: ObjectiveAttempt = {
      id: nanoid(), skill: "listening", createdAt: Date.now(), correct, total: LISTENING_QUESTIONS.length,
      estimatedBand: objectiveBand("listening", correct),
      durationSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      sectionScores: LISTENING_SECTIONS.map((section) => section.questions.filter((question) => isObjectiveAnswerCorrect(question, answers[question.id] || "")).length),
      answers,
      wrongQuestionIds: LISTENING_QUESTIONS.filter((question) => !isObjectiveAnswerCorrect(question, answers[question.id] || "")).map((question) => question.id),
    };
    setAttempts((existing) => saveObjectiveAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId, [attempt, ...existing]));
    setCurrentAttempt(attempt);
    setPhase("result");
    clearObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, "listening");
    setSavedDraft(null);
    Promise.resolve(onAttemptSaved?.(attempt)).catch((historyError) => console.error("Failed to sync listening attempt:", historyError));
    const cards = objectiveStudyCards("listening", LISTENING_QUESTIONS, answers);
    if (cards.length) {
      setStudySaveStatus("saving");
      Promise.resolve(onSaveStudyCards(cards, { skill: "listening" })).then(() => setStudySaveStatus("saved")).catch(() => setStudySaveStatus("failed"));
    }
  }, [answers, onAttemptSaved, onSaveStudyCards, ownerId, phase, startedAt, stopSpeech]);

  useEffect(() => {
    if (phase !== "active") return;
    saveObjectiveDraft(typeof window === "undefined" ? null : window.localStorage, ownerId, {
      skill: "listening",
      answers,
      sectionIndex,
      remainingSeconds,
      startedAt,
      updatedAt: Date.now(),
      playedSectionIds: Array.from(playedSections),
    });
  }, [answers, ownerId, phase, playedSections, remainingSeconds, sectionIndex, startedAt]);

  useEffect(() => {
    if (phase !== "active") return;
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "active" && remainingSeconds === 0) finishTest();
  }, [finishTest, phase, remainingSeconds]);

  const clearHistory = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear locally saved Listening history?")) return;
    setAttempts((existing) => saveObjectiveAttempts(window.localStorage, ownerId, existing.filter((attempt) => attempt.skill !== "listening")));
    Promise.resolve(onHistoryCleared?.()).catch((historyError) => console.error("Failed to clear cloud listening history:", historyError));
  };

  if (phase === "intro") {
    return (
      <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10"><div className="mx-auto my-auto w-full max-w-4xl"><motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button type="button" onClick={onExit} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> Practice home</button>
        <p className="text-xs font-bold uppercase tracking-widest text-[#7656A0] dark:text-[#d6bdec]">IELTS Listening</p><h2 className="mt-2 font-display text-3xl font-semibold text-[#2E2A27] dark:text-white sm:text-4xl">Hear it once. Catch what matters.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">Four original sections move from everyday conversation to an academic lecture. Each section plays once, and its transcript stays hidden until you submit.</p>
        <div className="mt-8 grid grid-cols-3 border-y border-[#E8E2D6] dark:border-[#3a2347]">{[['4', 'sections'], ['40', 'questions'], ['30', 'minutes']].map(([value, label], index) => <div key={label} className={`py-5 text-center ${index ? "border-l border-[#E8E2D6] dark:border-[#3a2347]" : ""}`}><strong className="block text-2xl text-[#2E2A27] dark:text-white">{value}</strong><span className="text-xs uppercase text-[#8B817A] dark:text-[#a58ebd]">{label}</span></div>)}</div>
        <button type="button" onClick={startTest} className="mt-7 inline-flex h-12 items-center gap-2 rounded-lg bg-[#4B3865] px-5 text-sm font-bold text-white hover:bg-[#5d477b] dark:bg-[#f2d276] dark:text-[#2c2430]"><Headphones size={18} /> Start full test</button>
        {savedDraft ? <button type="button" onClick={resumeTest} className="ml-3 mt-7 inline-flex h-12 items-center gap-2 rounded-lg border border-[#D7C5E5] px-5 text-sm font-bold text-[#654985] hover:bg-[#F4EFF8] dark:border-[#5a4669] dark:text-[#d6bdec]"><RotateCcw size={17} /> Resume · {formatTime(savedDraft.remainingSeconds)}</button> : null}
        <p className="mt-4 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">Original Hina scripts use your browser's English voices. The raw-score estimate is deterministic and is not an official IELTS result.</p>
        <ObjectiveHistory skill="listening" attempts={listeningAttempts} onRestart={startTest} onClear={clearHistory} />
      </motion.div></div></main>
    );
  }

  if (phase === "result" && currentAttempt) {
    const wrongQuestions = LISTENING_QUESTIONS.filter((question) => currentAttempt.wrongQuestionIds.includes(question.id));
    return (
      <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10"><div className="mx-auto w-full max-w-5xl">
        <button type="button" onClick={() => setPhase("intro")} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> Listening home</button>
        <div className="grid gap-6 border-y border-[#E8E2D6] py-7 dark:border-[#3a2347] md:grid-cols-[1fr_1.3fr]"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7656A0] dark:text-[#d6bdec]">Practice estimate</p><p className="mt-2 text-6xl font-semibold text-[#533C72] dark:text-[#d6bdec]">{currentAttempt.estimatedBand.toFixed(1)}</p><p className="mt-2 text-sm text-[#756B65] dark:text-[#bda9ca]">{currentAttempt.correct} correct out of {currentAttempt.total}</p></div><div className="grid grid-cols-4 divide-x divide-[#E8E2D6] border border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">{currentAttempt.sectionScores.map((score, index) => <div key={index} className="p-3"><span className="text-xs text-[#8B817A] dark:text-[#a58ebd]">S{index + 1}</span><strong className="mt-2 block text-xl text-[#34302D] dark:text-white">{score}/10</strong></div>)}</div></div>
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-bold text-[#332E2A] dark:text-white">Answer and transcript review</h3><p className="mt-1 text-sm text-[#7C746F] dark:text-[#bda9ca]">Every missed answer is tied to the words you heard.</p></div><button type="button" onClick={startTest} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#D9CFC0] px-4 text-sm font-bold text-[#554D48] hover:bg-white dark:border-[#4a3656] dark:text-[#dbcde2]"><RotateCcw size={16} /> Try again</button></div>
        {studySaveStatus !== "idle" && <p className="mt-3 text-xs text-[#837970] dark:text-[#a58ebd]">{studySaveStatus === "saving" ? "Saving review cards to Study…" : studySaveStatus === "saved" ? "The first five missed answers were saved to Study." : "Study cards could not be saved, but this result remains in local history."}</p>}
        <div className="mt-5 space-y-3">{wrongQuestions.map((question) => <article key={question.id} className="rounded-lg border border-[#E7DED1] bg-white p-4 dark:border-[#402c4c] dark:bg-[#25192e]"><div className="flex gap-3"><XCircle size={19} className="mt-0.5 shrink-0 text-[#B85C4D]" /><div><h4 className="text-sm font-bold text-[#3B3531] dark:text-white">Q{question.number}. {question.prompt}</h4><p className="mt-2 text-sm text-[#8A5145] dark:text-[#e7a28f]">Your answer: {answers[question.id] || "No answer"}</p><p className="mt-1 text-sm font-semibold text-[#533C72] dark:text-[#d6bdec]">Correct: {question.acceptedAnswers[0]}</p><p className="mt-3 text-sm leading-6 text-[#69615C] dark:text-[#c5b5ce]">“{question.evidence}”</p><p className="mt-1 text-xs leading-5 text-[#91877F] dark:text-[#9d8aaa]">{question.explanation}</p></div></div></article>)}{!wrongQuestions.length && <div className="flex items-center gap-3 rounded-lg border border-[#BFDCD6] bg-[#EAF5F2] p-4 text-sm font-semibold text-[#285F57] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]"><CheckCircle2 size={20} /> All forty answers are correct.</div>}</div>
        <section className="mt-8 border-t border-[#E8E2D6] pt-6 dark:border-[#3a2347]"><h3 className="text-xl font-bold text-[#332E2A] dark:text-white">Transcripts</h3><div className="mt-4 space-y-3">{LISTENING_SECTIONS.map((section, index) => <details key={section.id} className="rounded-lg border border-[#E5DDD1] bg-white dark:border-[#402c4c] dark:bg-[#25192e]"><summary className="cursor-pointer px-4 py-3 text-sm font-bold text-[#49423E] dark:text-white">Section {index + 1} · {section.title}</summary><div className="space-y-3 border-t border-[#EEE8DE] px-4 py-4 dark:border-[#402c4c]">{section.segments.map((segment, segmentIndex) => <p key={segmentIndex} className="text-sm leading-6 text-[#665E59] dark:text-[#c5b5ce]"><strong className="text-[#4B3865] dark:text-[#d6bdec]">{segment.speaker}:</strong> {segment.text}</p>)}</div></details>)}</div></section>
      </div></main>
    );
  }

  const section = LISTENING_SECTIONS[sectionIndex];
  const played = playedSections.has(section.id);
  const answeredCount = Object.values(answers).filter((answer) => String(answer).trim()).length;
  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#FDFBF7] dark:bg-[#1c1224]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[#E8E2D6] px-4 py-3 dark:border-[#3a2347] sm:px-7"><button type="button" onClick={() => { stopSpeech(); setSavedDraft(loadObjectiveDraft(window.localStorage, ownerId, "listening")); setPhase("intro"); }} className="flex items-center gap-2 text-sm font-semibold text-[#746B66] dark:text-[#bda9ca]"><ArrowLeft size={17} /> Save & exit</button><div className="ml-auto flex items-center gap-2 text-sm font-bold text-[#3E3834] dark:text-white"><Clock3 size={17} /> {formatTime(remainingSeconds)}</div><button type="button" onClick={finishTest} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#4B3865] px-3 text-xs font-bold text-white dark:bg-[#f2d276] dark:text-[#2c2430]"><Send size={14} /> Submit</button></header>
      <nav className="flex shrink-0 overflow-x-auto border-b border-[#E8E2D6] px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden dark:border-[#3a2347] sm:px-7">{LISTENING_SECTIONS.map((item, index) => { const count = item.questions.filter((question) => answers[question.id]?.trim()).length; return <button type="button" key={item.id} onClick={() => setSectionIndex(index)} className={`min-w-max border-b-2 px-4 py-3 text-xs font-bold ${index === sectionIndex ? "border-[#7656A0] text-[#5A4178] dark:text-[#d6bdec]" : "border-transparent text-[#887D75] dark:text-[#9d8aaa]"}`}>Section {index + 1} · {count}/10</button>; })}<span className="ml-auto min-w-max self-center pl-4 text-xs text-[#91877F] dark:text-[#9d8aaa]">{answeredCount}/40 answered</span></nav>
      <div className="mx-auto w-full max-w-4xl flex-1 overflow-y-auto px-4 py-7 sm:px-7">
        <div className="flex flex-col gap-5 border-b border-[#E8E2D6] pb-6 dark:border-[#3a2347] sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-[#7656A0] dark:text-[#d6bdec]">{section.context}</p><h2 className="mt-2 font-display text-2xl font-semibold text-[#2E2A27] dark:text-white">{section.title}</h2><p className="mt-2 text-sm text-[#7C746F] dark:text-[#bda9ca]">Read Questions {section.questions[0].number}–{section.questions[section.questions.length - 1].number}, then play this section once.</p></div><button type="button" onClick={() => playSection(sectionIndex)} disabled={played || Boolean(playingSectionId)} className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-[#4B3865] px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#D8D0DC] disabled:text-[#857A89] dark:disabled:bg-[#392943]">{playingSectionId === section.id ? <><Volume2 size={18} className="animate-pulse" /> Playing…</> : played ? <><PauseCircle size={18} /> Played once</> : <><Play size={18} /> Play section</>}</button></div>
        {speechError && <p role="alert" className="mt-4 rounded-lg border border-[#F0C9A8] bg-[#FFF4E8] px-4 py-3 text-sm text-[#8A502A] dark:border-[#67412f] dark:bg-[#39241f] dark:text-[#f0b28b]">{speechError}</p>}
        <div className="mt-7 space-y-8">{section.questions.map((question) => <ObjectiveQuestionField key={question.id} question={question} value={answers[question.id] || ""} onChange={(value) => setAnswers((current) => ({ ...current, [question.id]: value }))} />)}</div>
        <div className="mt-10 flex justify-between border-t border-[#E8E2D6] pt-5 dark:border-[#3a2347]"><button type="button" disabled={sectionIndex === 0} onClick={() => setSectionIndex((index) => index - 1)} className="h-10 rounded-lg border border-[#DED5C7] px-4 text-sm font-bold text-[#635B55] disabled:opacity-30 dark:border-[#4a3656] dark:text-[#cbbbd3]">Previous</button>{sectionIndex < 3 ? <button type="button" onClick={() => setSectionIndex((index) => index + 1)} className="h-10 rounded-lg bg-[#EEE8F4] px-4 text-sm font-bold text-[#5A4178] dark:bg-[#33263e] dark:text-[#d6bdec]">Next section</button> : <button type="button" onClick={finishTest} className="h-10 rounded-lg bg-[#4B3865] px-4 text-sm font-bold text-white dark:bg-[#f2d276] dark:text-[#2c2430]">Submit test</button>}</div>
      </div>
    </main>
  );
}


