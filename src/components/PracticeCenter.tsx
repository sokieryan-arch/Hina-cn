import { useCallback, useEffect, useState } from "react";
import { motion } from "motion/react";
import { AudioLines, BarChart3, BookOpenCheck, ChevronRight, FilePenLine, Headphones, Target } from "lucide-react";
import type {
  LanguageCode,
  PracticeAttempt,
  PracticeHistoryRecord,
  PracticeSkill,
  ObjectivePracticeSkill,
  SpeakingEvaluation,
  SpeakingEvaluationInput,
  SpeakingPart,
  SpeakingStudyCard,
  WritingEvaluation,
  WritingEvaluationInput,
  WritingTaskType,
} from "../shared/practiceTypes";
import { SpeakingPractice } from "./SpeakingPractice";
import { WritingPractice } from "./WritingPractice";
import { ReadingPractice } from "./ReadingPractice";
import { ListeningPractice } from "./ListeningPractice";
import { PracticeProgress, type PracticeSyncStatus } from "./PracticeProgress";
import { applyPracticeRecordsToLocal, loadLocalPracticeRecords, mergePracticeRecords, practiceRecord, recordsMissingFromCloud } from "../practice/practiceHistorySync";

interface PracticeCenterProps {
  ownerId: string;
  nativeLanguage: LanguageCode;
  onEvaluateSpeaking: (input: SpeakingEvaluationInput) => Promise<SpeakingEvaluation>;
  onSaveSpeakingStudyCards: (cards: SpeakingStudyCard[], context: { part: SpeakingPart; question: string }) => Promise<void> | void;
  onEvaluateWriting: (input: WritingEvaluationInput) => Promise<WritingEvaluation>;
  onSaveWritingStudyCards: (cards: SpeakingStudyCard[], context: { question: string; taskType: WritingTaskType }) => Promise<void> | void;
  onSaveObjectiveStudyCards: (cards: SpeakingStudyCard[], context: { skill: ObjectivePracticeSkill }) => Promise<void> | void;
  onLoadPracticeHistory?: () => Promise<PracticeHistoryRecord[]>;
  onSavePracticeRecord?: (record: PracticeHistoryRecord) => Promise<void>;
  onClearPracticeHistory?: (skill: PracticeSkill) => Promise<void>;
}

export function PracticeCenter({
  ownerId,
  nativeLanguage,
  onEvaluateSpeaking,
  onSaveSpeakingStudyCards,
  onEvaluateWriting,
  onSaveWritingStudyCards,
  onSaveObjectiveStudyCards,
  onLoadPracticeHistory,
  onSavePracticeRecord,
  onClearPracticeHistory,
}: PracticeCenterProps) {
  const [tool, setTool] = useState<"home" | "progress" | PracticeSkill>("home");
  const [records, setRecords] = useState<PracticeHistoryRecord[]>(() => loadLocalPracticeRecords(typeof window === "undefined" ? null : window.localStorage, ownerId));
  const [syncStatus, setSyncStatus] = useState<PracticeSyncStatus>(onLoadPracticeHistory ? "syncing" : "local");
  const [historyRevision, setHistoryRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const storage = typeof window === "undefined" ? null : window.localStorage;
    const local = loadLocalPracticeRecords(storage, ownerId);
    setRecords(local);
    setHistoryRevision((revision) => revision + 1);
    if (!onLoadPracticeHistory || !onSavePracticeRecord) {
      setSyncStatus("local");
      return () => { cancelled = true; };
    }
    setSyncStatus("syncing");
    onLoadPracticeHistory()
      .then(async (cloud) => {
        if (cancelled) return;
        const merged = mergePracticeRecords(local, cloud);
        applyPracticeRecordsToLocal(storage, ownerId, merged);
        setRecords(merged);
        setHistoryRevision((revision) => revision + 1);
        const uploads = await Promise.allSettled(recordsMissingFromCloud(local, cloud).map(onSavePracticeRecord));
        if (!cancelled) setSyncStatus(uploads.some((result) => result.status === "rejected") ? "error" : "synced");
      })
      .catch((error) => {
        console.error("Practice history sync failed:", error);
        if (!cancelled) setSyncStatus("error");
      });
    return () => { cancelled = true; };
  }, [onLoadPracticeHistory, onSavePracticeRecord, ownerId]);

  const handleAttemptSaved = useCallback((skill: PracticeSkill, attempt: PracticeAttempt) => {
    const record = practiceRecord(skill, attempt);
    setRecords((current) => mergePracticeRecords([record], current));
    if (onSavePracticeRecord) {
      setSyncStatus("syncing");
      onSavePracticeRecord(record).then(() => setSyncStatus("synced")).catch((error) => {
        console.error("Practice result cloud save failed:", error);
        setSyncStatus("error");
      });
    }
  }, [onSavePracticeRecord]);

  const handleHistoryCleared = useCallback(async (skill: PracticeSkill, retainedAttempts: PracticeAttempt[] = []) => {
    const retainedRecords = retainedAttempts.map((attempt) => practiceRecord(skill, attempt));
    setRecords((current) => mergePracticeRecords(retainedRecords, current.filter((record) => record.skill !== skill)));
    if (onClearPracticeHistory) {
      setSyncStatus("syncing");
      try {
        await onClearPracticeHistory(skill);
        if (onSavePracticeRecord) await Promise.all(retainedRecords.map(onSavePracticeRecord));
        setSyncStatus("synced");
      } catch (error) {
        console.error("Practice history cloud clear failed:", error);
        setSyncStatus("error");
      }
    }
  }, [onClearPracticeHistory, onSavePracticeRecord]);

  if (tool === "progress") {
    return <PracticeProgress records={records} syncStatus={syncStatus} onExit={() => setTool("home")} onStartSkill={setTool} />;
  }

  if (tool === "speaking") {
    return <SpeakingPractice historyRevision={historyRevision} ownerId={ownerId} nativeLanguage={nativeLanguage} onExit={() => setTool("home")} onEvaluate={onEvaluateSpeaking} onSaveStudyCards={onSaveSpeakingStudyCards} onAttemptSaved={(attempt) => handleAttemptSaved("speaking", attempt)} onHistoryCleared={() => handleHistoryCleared("speaking")} />;
  }
  if (tool === "writing") {
    return <WritingPractice historyRevision={historyRevision} ownerId={ownerId} nativeLanguage={nativeLanguage} onExit={() => setTool("home")} onEvaluate={onEvaluateWriting} onSaveStudyCards={onSaveWritingStudyCards} onAttemptSaved={(attempt) => handleAttemptSaved("writing", attempt)} onHistoryCleared={(retained) => handleHistoryCleared("writing", retained)} />;
  }
  if (tool === "reading") {
    return <ReadingPractice historyRevision={historyRevision} ownerId={ownerId} onExit={() => setTool("home")} onSaveStudyCards={onSaveObjectiveStudyCards} onAttemptSaved={(attempt) => handleAttemptSaved("reading", attempt)} onHistoryCleared={() => handleHistoryCleared("reading")} />;
  }
  if (tool === "listening") {
    return <ListeningPractice historyRevision={historyRevision} ownerId={ownerId} onExit={() => setTool("home")} onSaveStudyCards={onSaveObjectiveStudyCards} onAttemptSaved={(attempt) => handleAttemptSaved("listening", attempt)} onHistoryCleared={() => handleHistoryCleared("listening")} />;
  }

  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
      <div className="mx-auto my-auto w-full max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">IELTS Practice</p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-[#2E2A27] dark:text-white sm:text-4xl">Choose what to sharpen today.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">Each room keeps its own history, compares repeat attempts, and saves useful language back to Study.</p>
            </div>
            <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFD166] text-[#5E4812] sm:flex"><Target size={27} /></span>
          </div>

          <div className="mt-9 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
            <button type="button" onClick={() => setTool("progress")} className="group flex w-full items-center gap-4 bg-[#F5F1E8] px-3 py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] dark:bg-[#291c32] sm:gap-6 sm:px-5">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E2C78C] bg-[#FFF5DC] text-[#76551D] dark:border-[#5a4669] dark:bg-[#33263e] dark:text-[#f6d98e]"><BarChart3 size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Progress & next practice</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">See four-skill trends, your weakest evidence, and the most useful thing to practise next.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => setTool("listening")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#D7C5E5] bg-[#F4EFF8] text-[#654985] dark:border-[#5a4669] dark:bg-[#33263e] dark:text-[#d6bdec]"><Headphones size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Listening</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Play four original sections once, answer forty questions, then unlock the transcript and evidence.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => setTool("reading")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#BDDCD5] bg-[#EAF5F2] text-[#315E58] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]"><BookOpenCheck size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Academic Reading</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Work through three original passages, then review every missed answer against exact textual evidence.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => setTool("speaking")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#E6C98A] bg-[#FFF8E7] text-[#86652A] dark:border-[#5a4669] dark:bg-[#33263e] dark:text-[#f6d98e]"><AudioLines size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Speaking</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Record Parts 1–3, receive evidence-based band feedback, and retry the same prompt.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
            <button type="button" onClick={() => setTool("writing")} className="group flex w-full items-center gap-4 py-6 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#BDDCD5] bg-[#EAF5F2] text-[#315E58] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]"><FilePenLine size={25} /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-bold text-[#35312F] dark:text-white">Writing</span><span className="mt-1 block text-sm leading-6 text-[#7C746F] dark:text-[#bda9ca]">Describe Task 1 visuals or build a Task 2 argument, then revise from exact sentence evidence.</span></span>
              <ChevronRight size={20} className="shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1" />
            </button>
          </div>

          <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">Practice estimates are designed for learning and are not official IELTS results.</p>
        </motion.div>
      </div>
    </main>
  );
}


