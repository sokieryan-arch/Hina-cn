import { History, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { averageSpeakingScores } from "../practice/speakingHistory";
import type { SpeakingAttempt, SpeakingScores } from "../shared/practiceTypes";

const SCORE_LABELS: Array<{ key: keyof SpeakingScores; label: string }> = [
  { key: "fluency", label: "Fluency" },
  { key: "lexicalResource", label: "Vocabulary" },
  { key: "grammar", label: "Grammar" },
  { key: "pronunciation", label: "Pronunciation" },
];

const ATTEMPT_DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

function formatAttemptDate(timestamp: number) {
  return ATTEMPT_DATE_FORMAT.format(timestamp);
}

function scoreDelta(current: number, previous: number) {
  const delta = Math.round((current - previous) * 10) / 10;
  return delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
}

export function SpeakingHistory({ attempts, onPracticeAgain, onClear }: {
  attempts: SpeakingAttempt[];
  onPracticeAgain: (attempt: SpeakingAttempt) => void;
  onClear?: () => void;
}) {
  const averages = averageSpeakingScores(attempts);
  if (!averages) return null;

  return (
    <section className="mt-10 border-t border-[#E8E2D6] pt-7 dark:border-[#3a2347]" aria-labelledby="practice-history-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]"><History size={15} /> Your practice trail</p>
          <h3 id="practice-history-title" className="mt-2 font-display text-2xl font-semibold text-[#2E2A27] dark:text-white">A little clearer each time.</h3>
        </div>
        <div className="text-right">
          <strong className="font-display text-4xl font-semibold text-[#2F5D54] dark:text-[#a9ddd3]">{averages.estimatedBand.toFixed(1)}</strong>
          <span className="ml-2 text-xs font-semibold text-[#8A817C]">average · {attempts.length} {attempts.length === 1 ? "attempt" : "attempts"}</span>
          {onClear && (
            <button type="button" onClick={onClear} className="ml-auto mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#9A6B62] hover:text-[#8A3F34] dark:text-[#c999a9] dark:hover:text-[#f1b8ca]">
              <Trash2 size={13} /> Clear history
            </button>
          )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-[#E8E2D6] bg-[#E8E2D6] dark:border-[#3a2347] dark:bg-[#3a2347] sm:grid-cols-4">
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key} className="bg-white px-4 py-3 dark:bg-[#291a33]">
            <strong className="text-lg text-[#35312F] dark:text-white">{averages.scores[key].toFixed(1)}</strong>
            <span className="ml-2 text-xs text-[#8A817C] dark:text-[#a58ebd]">{label}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
        {attempts.slice(0, 5).map((attempt) => (
          <div key={attempt.id} className="flex items-center gap-3 py-4 sm:gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#FFF0C3] font-display text-lg font-semibold text-[#765819] dark:bg-[#3c2d45] dark:text-[#f1d797]">{attempt.estimatedBand.toFixed(1)}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-[#35312F] dark:text-white">Part {attempt.part} · {attempt.question}</p>
              <p className="mt-1 text-xs text-[#958A83] dark:text-[#a58ebd]">{formatAttemptDate(attempt.createdAt)}</p>
            </div>
            <button type="button" onClick={() => onPracticeAgain(attempt)} aria-label={`Practice again: ${attempt.question}`} className="flex shrink-0 items-center gap-2 rounded-full border border-[#D8CDBB] px-3 py-2 text-xs font-bold text-[#5D554F] hover:bg-white dark:border-[#4b4054] dark:text-[#e5dceb] dark:hover:bg-[#291a33]">
              <RotateCcw size={14} /> <span className="hidden sm:inline">Practice again</span>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SpeakingComparison({ previous, current }: { previous: SpeakingAttempt; current: SpeakingAttempt }) {
  return (
    <section className="mt-7 border-y border-[#C8DDD8] bg-[#F1F8F6] px-4 py-5 dark:border-[#2e5661] dark:bg-[#17303a] sm:px-5" aria-labelledby="attempt-comparison-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#2F6B60] dark:text-[#a9ddd3]"><TrendingUp size={15} /> Same prompt comparison</p>
          <h3 id="attempt-comparison-title" className="mt-1 font-bold text-[#294F49] dark:text-white">{previous.estimatedBand.toFixed(1)} → {current.estimatedBand.toFixed(1)}</h3>
        </div>
        <strong className={`text-sm ${current.estimatedBand >= previous.estimatedBand ? "text-[#25704E] dark:text-[#8de0bb]" : "text-[#9B5C34] dark:text-[#efbd9d]"}`}>
          {scoreDelta(current.estimatedBand, previous.estimatedBand)} overall
        </strong>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SCORE_LABELS.map(({ key, label }) => (
          <div key={key}>
            <span className="block text-[11px] font-semibold text-[#6C817C] dark:text-[#9dc2ba]">{label}</span>
            <strong className="mt-1 block text-sm text-[#294F49] dark:text-white">{current.scores[key].toFixed(1)} <span className="font-medium opacity-65">({scoreDelta(current.scores[key], previous.scores[key])})</span></strong>
          </div>
        ))}
      </div>
    </section>
  );
}


