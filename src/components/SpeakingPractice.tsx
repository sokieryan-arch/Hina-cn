import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import {
  Activity,
  ArrowLeft,
  AudioLines,
  BookOpen,
  Brain,
  Check,
  ChevronRight,
  Clock3,
  Gauge,
  Lightbulb,
  Mic,
  RotateCcw,
  Send,
  Square,
  Target,
} from "lucide-react";
import { speakingQuestionsForPart } from "../practice/speakingQuestions";
import { createSpeakingAttempt, loadSpeakingAttempts, saveSpeakingAttempts } from "../practice/speakingHistory";
import { SpeakingComparison, SpeakingHistory } from "./SpeakingHistory";
import type {
  LanguageCode,
  SpeakingAttempt,
  SpeakingEvaluation,
  SpeakingEvaluationInput,
  SpeakingPart,
  SpeakingQuestion,
  SpeakingStudyCard,
} from "../shared/practiceTypes";

type PracticePhase = "ready" | "preparing" | "recording" | "recorded" | "evaluating" | "result";

interface SpeakingPracticeProps {
  ownerId: string;
  historyRevision?: number;
  nativeLanguage: LanguageCode;
  onExit?: () => void;
  onEvaluate: (input: SpeakingEvaluationInput) => Promise<SpeakingEvaluation>;
  onSaveStudyCards: (cards: SpeakingStudyCard[], context: { part: SpeakingPart; question: string }) => Promise<void> | void;
  onAttemptSaved?: (attempt: SpeakingAttempt) => Promise<void> | void;
  onHistoryCleared?: () => Promise<void> | void;
}

const PARTS: Array<{
  part: SpeakingPart;
  label: string;
  time: string;
  copy: string;
  accent: string;
}> = [
  {
    part: 1,
    label: "Introduction",
    time: "45 sec answers",
    copy: "Warm, personal questions about everyday life.",
    accent: "border-[#E7CE8D] bg-[#FFF5DC] text-[#6E5119] dark:border-[#5c4a3a] dark:bg-[#32293a] dark:text-[#f1d797]",
  },
  {
    part: 2,
    label: "Long turn",
    time: "1 min prep · 2 min answer",
    copy: "Build one clear story from a cue card.",
    accent: "border-[#ADD6CF] bg-[#EAF6F3] text-[#245B54] dark:border-[#2e5661] dark:bg-[#17303a] dark:text-[#a9ddd3]",
  },
  {
    part: 3,
    label: "Discussion",
    time: "75 sec answers",
    copy: "Explore a broader idea and support your opinion.",
    accent: "border-[#E6C0C8] bg-[#FCECEF] text-[#7E3F4B] dark:border-[#633451] dark:bg-[#3a1f35] dark:text-[#f1b8ca]",
  },
];

const SCORE_LABELS: Array<{ key: keyof SpeakingEvaluation["scores"]; label: string; icon: typeof Activity }> = [
  { key: "fluency", label: "Fluency", icon: Activity },
  { key: "lexicalResource", label: "Vocabulary", icon: BookOpen },
  { key: "grammar", label: "Grammar", icon: Brain },
  { key: "pronunciation", label: "Pronunciation", icon: AudioLines },
];

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.max(0, totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function preferredMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function blobToBase64(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The recording could not be read."));
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.split(",")[1];
      if (!base64) reject(new Error("The recording was empty."));
      else resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

function PromptCard({ question }: { question: SpeakingQuestion }) {
  return (
    <section className="border-y border-[#E8E2D6] dark:border-[#3a2347] py-7 sm:py-9">
      <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">
        Part {question.part} · {question.eyebrow}
      </p>
      <h2 className="mt-3 max-w-3xl font-display text-2xl font-semibold leading-tight text-[#2E2A27] dark:text-white sm:text-3xl">
        {question.question}
      </h2>
      {question.cues.length > 0 && (
        <div className="mt-6 border-l-2 border-[#E0A835] pl-5">
          <p className="text-sm font-semibold text-[#746B66] dark:text-[#c8b9d3]">You should say:</p>
          <ul className="mt-2 space-y-1.5 text-sm leading-6 text-[#5A5551] dark:text-[#d7cce0]">
            {question.cues.map((cue) => <li key={cue}>· {cue}</li>)}
          </ul>
        </div>
      )}
    </section>
  );
}

export function SpeakingPractice({ ownerId, historyRevision, nativeLanguage, onExit, onEvaluate, onSaveStudyCards, onAttemptSaved, onHistoryCleared }: SpeakingPracticeProps) {
  const [part, setPart] = useState<SpeakingPart | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<PracticePhase>("ready");
  const [hasPrepared, setHasPrepared] = useState(false);
  const [prepRemaining, setPrepRemaining] = useState(0);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<SpeakingEvaluation | null>(null);
  const [attempts, setAttempts] = useState<SpeakingAttempt[]>(() => loadSpeakingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  const [currentAttempt, setCurrentAttempt] = useState<SpeakingAttempt | null>(null);
  const [comparisonAttempt, setComparisonAttempt] = useState<SpeakingAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [studySaveStatus, setStudySaveStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const questions = useMemo(() => part ? speakingQuestionsForPart(part) : [], [part]);
  const question = questions[questionIndex] || null;

  useEffect(() => {
    setAttempts(loadSpeakingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId));
  }, [historyRevision, ownerId]);

  const releaseMicrophone = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const clearRecording = () => {
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
    setRecordingBlob(null);
    setRecordingUrl(null);
    setRecordingSeconds(0);
    setEvaluation(null);
    setCurrentAttempt(null);
    setError(null);
    setStudySaveStatus("idle");
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  useEffect(() => () => {
    releaseMicrophone();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, [recordingUrl]);

  useEffect(() => {
    if (phase !== "preparing") return;
    if (prepRemaining <= 0) {
      setPhase("ready");
      return;
    }
    const timer = window.setTimeout(() => setPrepRemaining((seconds) => seconds - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, prepRemaining]);

  useEffect(() => {
    if (phase !== "recording") return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "recording" && question && recordingSeconds >= question.answerSeconds) stopRecording();
  }, [phase, question, recordingSeconds]);

  const choosePart = (nextPart: SpeakingPart) => {
    clearRecording();
    setPart(nextPart);
    setQuestionIndex(0);
    setComparisonAttempt(null);
    setHasPrepared(false);
    setPhase("ready");
  };

  const leaveSession = () => {
    stopRecording();
    releaseMicrophone();
    clearRecording();
    setPart(null);
    setQuestionIndex(0);
    setComparisonAttempt(null);
    setHasPrepared(false);
    setPhase("ready");
  };

  const startPreparation = () => {
    if (!question) return;
    clearRecording();
    setHasPrepared(true);
    setPrepRemaining(question.prepSeconds);
    setPhase("preparing");
  };

  const startRecording = async () => {
    if (!question) return;
    clearRecording();
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio. Try the latest Chrome, Edge, or Safari.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      const mimeType = preferredMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        audioBitsPerSecond: 32_000,
      });
      streamRef.current = stream;
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        releaseMicrophone();
        recorderRef.current = null;
        if (blob.size === 0) {
          setError("No sound was captured. Please check your microphone and try again.");
          setPhase("ready");
          return;
        }
        setRecordingBlob(blob);
        setRecordingUrl(URL.createObjectURL(blob));
        setPhase("recorded");
      };
      recorder.start(500);
      setRecordingSeconds(0);
      setPhase("recording");
    } catch (recordingError) {
      releaseMicrophone();
      console.error("Microphone access failed:", recordingError);
      setError("Hina could not access your microphone. Allow microphone access in the browser and try again.");
      setPhase("ready");
    }
  };

  const submitRecording = async () => {
    if (!question || !recordingBlob) return;
    setError(null);
    setPhase("evaluating");
    try {
      const result = await onEvaluate({
        questionId: question.id,
        audioBase64: await blobToBase64(recordingBlob),
        mimeType: recordingBlob.type || "audio/webm",
        nativeLanguage,
      });
      const previousAttempt = attempts.find((attempt) => attempt.questionId === question.id) || null;
      const attempt = createSpeakingAttempt(nanoid(), question, result);
      setAttempts((existing) => saveSpeakingAttempts(
        typeof window === "undefined" ? null : window.localStorage,
        ownerId,
        [attempt, ...existing.filter((item) => item.id !== attempt.id)],
      ));
      setComparisonAttempt(previousAttempt);
      setCurrentAttempt(attempt);
      setEvaluation(result);
      setPhase("result");
      Promise.resolve(onAttemptSaved?.(attempt)).catch((historyError) => console.error("Failed to sync speaking attempt:", historyError));
      setStudySaveStatus("saving");
      Promise.resolve(onSaveStudyCards(result.studyCards, { part: question.part, question: question.question }))
        .then(() => setStudySaveStatus("saved"))
        .catch((studyError) => {
          console.error("Failed to save speaking study cards:", studyError);
          setStudySaveStatus("failed");
        });
    } catch (evaluationError) {
      setError(evaluationError instanceof Error ? evaluationError.message : "Hina could not review this answer yet.");
      setPhase("recorded");
    }
  };

  const retryStudyCards = async () => {
    if (!evaluation || !question || studySaveStatus === "saving") return;
    setStudySaveStatus("saving");
    try {
      await onSaveStudyCards(evaluation.studyCards, { part: question.part, question: question.question });
      setStudySaveStatus("saved");
    } catch (studyError) {
      console.error("Failed to save speaking study cards:", studyError);
      setStudySaveStatus("failed");
    }
  };

  const retryQuestion = () => {
    const baseline = currentAttempt;
    clearRecording();
    setComparisonAttempt(baseline);
    setHasPrepared(false);
    setPhase("ready");
  };

  const practiceAgain = (attempt: SpeakingAttempt) => {
    const nextQuestions = speakingQuestionsForPart(attempt.part);
    const nextQuestionIndex = nextQuestions.findIndex((item) => item.id === attempt.questionId);
    clearRecording();
    setPart(attempt.part);
    setQuestionIndex(Math.max(0, nextQuestionIndex));
    setComparisonAttempt(attempt);
    setHasPrepared(false);
    setPhase("ready");
  };

  const clearPracticeHistory = () => {
    if (typeof window !== "undefined" && !window.confirm("Clear all locally saved speaking practice history?")) return;
    setAttempts(saveSpeakingAttempts(typeof window === "undefined" ? null : window.localStorage, ownerId, []));
    Promise.resolve(onHistoryCleared?.()).catch((historyError) => console.error("Failed to clear cloud speaking history:", historyError));
  };

  const nextQuestion = () => {
    clearRecording();
    setQuestionIndex((index) => (index + 1) % questions.length);
    setComparisonAttempt(null);
    setHasPrepared(false);
    setPhase("ready");
  };

  if (!part || !question) {
    return (
      <main className="flex-1 overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
        <div className="mx-auto w-full max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {onExit ? (
              <button type="button" onClick={onExit} className="mb-7 flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white">
                <ArrowLeft size={17} /> Practice home
              </button>
            ) : null}
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">IELTS Speaking</p>
                <h2 className="mt-2 max-w-full font-display text-2xl font-semibold tracking-normal text-[#2E2A27] dark:text-white sm:text-4xl">
                  Practice one honest answer.
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">
                  Choose a part, speak naturally, then let Hina point out the clearest next improvement.
                </p>
              </div>
              <span className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#FFD166] text-[#5E4812] sm:flex">
                <Target size={27} />
              </span>
            </div>

            <div className="mt-9 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
              {PARTS.map((item, index) => (
                <motion.button
                  key={item.part}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                  onClick={() => choosePart(item.part)}
                  className="group flex w-full items-center gap-3 overflow-hidden py-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] sm:gap-6 sm:py-6"
                >
                  <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-lg font-bold ${item.accent}`}>
                    {item.part}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-bold text-[#35312F] dark:text-white">Part {item.part} · {item.label}</span>
                      <span className="basis-full text-xs font-semibold text-[#A18C78] dark:text-[#a995b7] sm:basis-auto">{item.time}</span>
                    </span>
                    <span className="mt-1 block text-sm text-[#7C746F] dark:text-[#bda9ca]">{item.copy}</span>
                  </span>
                  <ChevronRight size={20} className="hidden shrink-0 text-[#B5A48B] transition-transform group-hover:translate-x-1 sm:block" />
                </motion.button>
              ))}
            </div>

            <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">
              AI feedback is for practice only and is not an official IELTS score.
            </p>
            <SpeakingHistory attempts={attempts} onPracticeAgain={practiceAgain} onClear={clearPracticeHistory} />
          </motion.div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-[#FDFBF7] px-4 py-5 dark:bg-[#1c1224] sm:px-7 sm:py-7">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between gap-4">
          <button type="button" onClick={leaveSession} className="flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white">
            <ArrowLeft size={17} /> All parts
          </button>
          <span className="text-xs font-semibold text-[#A18C78] dark:text-[#a995b7]">
            Prompt {questionIndex + 1} of {questions.length}
          </span>
        </div>

        <PromptCard question={question} />

        <section className="py-7 sm:py-9">
          {phase === "preparing" && (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-widest text-[#A16E28]">Preparation time</span>
              <strong className="mt-4 font-display text-6xl font-semibold tabular-nums text-[#2E2A27] dark:text-white">{formatTime(prepRemaining)}</strong>
              <p className="mt-4 text-sm text-[#7C746F] dark:text-[#bda9ca]">Note a beginning, one vivid detail, and a clear ending.</p>
              <button type="button" onClick={() => setPhase("ready")} className="mt-6 text-sm font-bold text-[#2F6B60] dark:text-[#9ed8ce]">I’m ready now</button>
            </div>
          )}

          {phase === "ready" && (
            <div className="flex min-h-48 flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FFF0C3] text-[#8A6419] dark:bg-[#3c2d45] dark:text-[#f1d797]">
                {question.prepSeconds > 0 ? <Clock3 size={26} /> : <Mic size={26} />}
              </span>
              <h3 className="mt-4 font-bold text-[#35312F] dark:text-white">
                {question.prepSeconds > 0 ? "Take a minute to shape your story" : "Answer as if Hina were the examiner"}
              </h3>
              <p className="mt-2 text-sm text-[#7C746F] dark:text-[#bda9ca]">Aim for ideas that are clear, specific, and genuinely yours.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {question.prepSeconds > 0 && !hasPrepared && recordingSeconds === 0 && (
                  <button type="button" onClick={startPreparation} className="rounded-full border border-[#D8CDBB] bg-white px-5 py-3 text-sm font-bold text-[#5D554F] shadow-sm dark:border-[#4b4054] dark:bg-[#291a33] dark:text-[#e5dceb]">
                    Start 1-minute prep
                  </button>
                )}
                <button type="button" onClick={startRecording} className="flex items-center gap-2 rounded-full bg-[#2F5D54] px-6 py-3 text-sm font-bold text-white shadow-md transition-transform hover:-translate-y-0.5 dark:bg-[#6f4586]">
                  <Mic size={17} /> Start recording
                </button>
              </div>
            </div>
          )}

          {phase === "recording" && (
            <div className="flex min-h-52 flex-col items-center justify-center text-center">
              <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#FBEAEC] text-[#B14F5E] dark:bg-[#3a1f35] dark:text-[#f1b8ca]">
                <span className="absolute inset-0 animate-ping rounded-full bg-[#E9A6B0]/35" />
                <AudioLines size={28} className="relative" />
              </span>
              <strong className="mt-5 font-display text-4xl font-semibold tabular-nums text-[#2E2A27] dark:text-white">
                {formatTime(recordingSeconds)} <span className="text-lg text-[#A18C78]">/ {formatTime(question.answerSeconds)}</span>
              </strong>
              <p className="mt-2 text-sm text-[#7C746F] dark:text-[#bda9ca]">Keep going. A pause is allowed; your idea still belongs to you.</p>
              <button type="button" onClick={stopRecording} className="mt-6 flex items-center gap-2 rounded-full bg-[#B14F5E] px-6 py-3 text-sm font-bold text-white shadow-md">
                <Square size={15} fill="currentColor" /> Finish answer
              </button>
            </div>
          )}

          {(phase === "recorded" || phase === "evaluating") && recordingUrl && (
            <div className="mx-auto max-w-xl">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#EAF5F2] text-[#2F6B60] dark:bg-[#17303a] dark:text-[#a9ddd3]"><Check size={20} /></span>
                <div>
                  <h3 className="font-bold text-[#35312F] dark:text-white">Answer captured</h3>
                  <p className="text-xs text-[#8A817C] dark:text-[#a58ebd]">Listen once before sending it to Hina.</p>
                </div>
              </div>
              <audio controls src={recordingUrl} className="mt-5 w-full" />
              {error && <p className="mt-4 rounded-lg border border-[#E9C5CA] bg-[#FBEAEC] px-4 py-3 text-sm text-[#82434C] dark:border-[#633451] dark:bg-[#3a1f35] dark:text-[#f1b8ca]">{error}</p>}
              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button type="button" disabled={phase === "evaluating"} onClick={() => { clearRecording(); setPhase("ready"); }} className="flex items-center gap-2 rounded-full border border-[#D8CDBB] bg-white px-5 py-3 text-sm font-bold text-[#5D554F] disabled:opacity-50 dark:border-[#4b4054] dark:bg-[#291a33] dark:text-[#e5dceb]">
                  <RotateCcw size={16} /> Retake
                </button>
                <button type="button" disabled={phase === "evaluating"} onClick={submitRecording} className="flex items-center gap-2 rounded-full bg-[#2F5D54] px-6 py-3 text-sm font-bold text-white shadow-md disabled:cursor-wait disabled:opacity-65 dark:bg-[#6f4586]">
                  {phase === "evaluating" ? <><Gauge size={17} className="animate-pulse" /> Hina is listening…</> : <><Send size={16} /> Get feedback</>}
                </button>
              </div>
            </div>
          )}

          {phase === "result" && evaluation && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex flex-wrap items-end justify-between gap-5 border-b border-[#E8E2D6] pb-6 dark:border-[#3a2347]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">Practice estimate</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <strong className="font-display text-5xl font-semibold text-[#2F5D54] dark:text-[#a9ddd3]">{evaluation.estimatedBand.toFixed(1)}</strong>
                    <span className="text-sm font-semibold text-[#8A817C]">band impression</span>
                  </div>
                </div>
                <p className="max-w-md text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{evaluation.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#E8E2D6] bg-[#E8E2D6] dark:border-[#3a2347] dark:bg-[#3a2347] sm:grid-cols-4">
                {SCORE_LABELS.map(({ key, label, icon: Icon }) => (
                  <div key={key} className="bg-white p-4 dark:bg-[#291a33]">
                    <Icon size={17} className="text-[#A16E28] dark:text-[#d6bdec]" />
                    <strong className="mt-3 block text-2xl text-[#35312F] dark:text-white">{evaluation.scores[key].toFixed(1)}</strong>
                    <span className="text-xs font-semibold text-[#8A817C] dark:text-[#a58ebd]">{label}</span>
                  </div>
                ))}
              </div>

              {evaluation.evidence?.confidence === "low" && (
                <p className="mt-4 rounded-lg border border-[#E8C98F] bg-[#FFF8E8] px-4 py-3 text-sm leading-6 text-[#765819] dark:border-[#6d5735] dark:bg-[#352c20] dark:text-[#f1d797]">
                  Evidence check: {evaluation.evidence.transcribedWordCount} transcribed words. The score was capped at {evaluation.evidence.scoreCeiling?.toFixed(1)} because the recording did not contain enough language for a reliable higher-band estimate.
                </p>
              )}

              {comparisonAttempt && currentAttempt && <SpeakingComparison previous={comparisonAttempt} current={currentAttempt} />}

              <div className="mt-7 grid gap-7 sm:grid-cols-2">
                <section>
                  <h3 className="flex items-center gap-2 font-bold text-[#35312F] dark:text-white"><Check size={18} className="text-[#2F8B61]" /> What worked</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">
                    {evaluation.strengths.map((item) => <li key={item}>· {item}</li>)}
                    {evaluation.strengths.length === 0 && <li>No evidence-backed strength could be confirmed from this recording.</li>}
                  </ul>
                </section>
                <section>
                  <h3 className="flex items-center gap-2 font-bold text-[#35312F] dark:text-white"><Lightbulb size={18} className="text-[#D28B1E]" /> Try next</h3>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">
                    {evaluation.priorities.map((item) => <li key={item}>· {item}</li>)}
                  </ul>
                </section>
              </div>

              <details open={evaluation.evidence?.confidence === "low"} className="mt-7 border-t border-[#E8E2D6] pt-5 dark:border-[#3a2347]">
                <summary className="cursor-pointer font-bold text-[#35312F] dark:text-white">Transcript</summary>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#625B56] dark:text-[#d7cce0]">{evaluation.transcript}</p>
              </details>
              {evaluation.improvedAnswer && (
                <section className="mt-6 rounded-lg border border-[#BDDCD5] bg-[#EDF7F5] p-5 dark:border-[#2e5661] dark:bg-[#17303a]">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#2F6B60] dark:text-[#a9ddd3]">A clearer version in your voice</h3>
                  <p className="mt-3 text-sm leading-7 text-[#3E625D] dark:text-[#d1e9e5]">{evaluation.improvedAnswer}</p>
                </section>
              )}

              <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E2D6] pt-6 dark:border-[#3a2347]">
                {studySaveStatus === "failed" ? (
                  <button type="button" onClick={retryStudyCards} className="flex items-center gap-2 text-sm font-bold text-[#A06032] dark:text-[#efbd9d]">
                    <BookOpen size={17} /> Study cards failed · Try again
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-sm font-bold text-[#2F6B60] dark:text-[#a9ddd3]">
                    <BookOpen size={17} /> {studySaveStatus === "saved" ? "4 cards saved to Study" : "Saving 4 cards to Study…"}
                  </span>
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={retryQuestion} className="rounded-full border border-[#D8CDBB] bg-white px-5 py-3 text-sm font-bold text-[#5D554F] dark:border-[#4b4054] dark:bg-[#291a33] dark:text-[#e5dceb]">Try again</button>
                  <button type="button" onClick={nextQuestion} className="flex items-center gap-2 rounded-full bg-[#2F5D54] px-5 py-3 text-sm font-bold text-white dark:bg-[#6f4586]">Next prompt <ChevronRight size={16} /></button>
                </div>
              </div>
              <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">This AI estimate is for practice and is not an official IELTS result.</p>
            </motion.div>
          )}
        </section>
      </div>
    </main>
  );
}


