import { BarChart3, RotateCcw, Trash2 } from "lucide-react";
import type { ObjectiveAttempt, ObjectivePracticeSkill } from "../shared/practiceTypes";

interface ObjectiveHistoryProps {
  skill: ObjectivePracticeSkill;
  attempts: ObjectiveAttempt[];
  onRestart: () => void;
  onClear: () => void;
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(timestamp);
}

export function ObjectiveHistory({ skill, attempts, onRestart, onClear }: ObjectiveHistoryProps) {
  if (!attempts.length) return null;
  const average = attempts.reduce((sum, attempt) => sum + attempt.estimatedBand, 0) / attempts.length;
  const best = Math.max(...attempts.map((attempt) => attempt.estimatedBand));

  return (
    <section className="mt-10 border-t border-[#E8E2D6] pt-7 dark:border-[#3a2347]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-[#3D3733] dark:text-white"><BarChart3 size={17} /> Recent {skill} practice</p>
          <p className="mt-1 text-xs text-[#8B817A] dark:text-[#a58ebd]">Average {average.toFixed(1)} · Best {best.toFixed(1)} · Stored on this device</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onRestart} className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#DED5C7] px-3 text-xs font-bold text-[#635B55] hover:bg-white dark:border-[#4a3656] dark:text-[#cbbbd3] dark:hover:bg-[#2b1d35]"><RotateCcw size={14} /> Start again</button>
          <button type="button" onClick={onClear} title="Clear history" aria-label="Clear history" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E5D7D2] text-[#A75D4B] hover:bg-[#FFF1ED] dark:border-[#593743] dark:text-[#e7a28f] dark:hover:bg-[#3a202b]"><Trash2 size={15} /></button>
        </div>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-[#E8E2D6] bg-white dark:border-[#3f2b4a] dark:bg-[#25192e]">
        {attempts.slice(0, 5).map((attempt, index) => (
          <div key={attempt.id} className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-4 py-3 text-sm ${index ? "border-t border-[#EEE8DE] dark:border-[#3f2b4a]" : ""}`}>
            <span className="min-w-0 truncate text-[#6D645E] dark:text-[#c5b5ce]">{formatDate(attempt.createdAt)}</span>
            <span className="font-semibold text-[#554D48] dark:text-[#e7ddeb]">{attempt.correct}/{attempt.total}</span>
            <span className="w-12 text-right text-lg font-bold text-[#24665D] dark:text-[#9ddad0]">{attempt.estimatedBand.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}


