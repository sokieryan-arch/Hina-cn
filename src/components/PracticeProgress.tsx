import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Cloud, CloudOff, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { buildPracticeSummaries, overallPracticeBand, PRACTICE_SKILL_LABELS, recommendNextPractice } from "../practice/practiceProgress";
import type { PracticeHistoryRecord, PracticeSkill } from "../shared/practiceTypes";

export type PracticeSyncStatus = "local" | "syncing" | "synced" | "error";

interface PracticeProgressProps {
  records: PracticeHistoryRecord[];
  syncStatus: PracticeSyncStatus;
  onExit: () => void;
  onStartSkill: (skill: PracticeSkill) => void;
}

function score(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function dateLabel(value: number | null) {
  if (!value) return "Not attempted";
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(value));
}

function Trend({ value }: { value: number | null }) {
  if (value === null) return <span className="inline-flex items-center gap-1 text-[#968B84] dark:text-[#8e7b9b]"><Minus size={13} /> baseline</span>;
  if (value > 0) return <span className="inline-flex items-center gap-1 text-[#28735D] dark:text-[#91d9c4]"><TrendingUp size={13} /> +{value.toFixed(1)}</span>;
  if (value < 0) return <span className="inline-flex items-center gap-1 text-[#A45749] dark:text-[#e9a697]"><TrendingDown size={13} /> {value.toFixed(1)}</span>;
  return <span className="inline-flex items-center gap-1 text-[#7A716B] dark:text-[#a58ebd]"><Minus size={13} /> steady</span>;
}

export function PracticeProgress({ records, syncStatus, onExit, onStartSkill }: PracticeProgressProps) {
  const summaries = buildPracticeSummaries(records);
  const overall = overallPracticeBand(summaries);
  const recommendation = recommendNextPractice(summaries);
  const completedSkills = summaries.filter((summary) => summary.latestBand !== null).length;

  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-[#FDFBF7] px-4 py-7 dark:bg-[#1c1224] sm:px-7 sm:py-10">
      <motion.div className="mx-auto w-full max-w-5xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onExit} className="flex items-center gap-2 text-sm font-semibold text-[#746B66] hover:text-[#2E2A27] dark:text-[#bda9ca] dark:hover:text-white"><ArrowLeft size={17} /> Practice home</button>
          <span className={`inline-flex items-center gap-2 text-xs ${syncStatus === "error" ? "text-[#A45749] dark:text-[#e9a697]" : "text-[#887D75] dark:text-[#9d8aaa]"}`}>
            {syncStatus === "error" ? <CloudOff size={14} /> : <Cloud size={14} />}
            {syncStatus === "syncing" ? "Syncing practice history…" : syncStatus === "synced" ? "Synced across devices" : syncStatus === "error" ? "Saved locally · cloud retry later" : "Saved on this device"}
          </span>
        </div>

        <header className="mt-8 grid gap-6 border-y border-[#E8E2D6] py-8 dark:border-[#3a2347] md:grid-cols-[0.7fr_1.3fr] md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">Four-skill picture</p>
            <div className="mt-3 flex items-end gap-3"><strong className="text-6xl font-semibold text-[#2B6257] dark:text-[#9ddad0]">{score(overall)}</strong><span className="pb-2 text-sm font-semibold text-[#7C746F] dark:text-[#bda9ca]">current average</span></div>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-[#302B28] dark:text-white">Your next useful hour is already chosen.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#746B66] dark:text-[#bda9ca]">Scores show your latest evidence, not a permanent label. Repeat the same skill to make the trend meaningful.</p>
          </div>
        </header>

        <section className="mt-8">
          <div className="flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#267066] dark:text-[#9ddad0]">Scoreboard</p><h2 className="mt-1 text-xl font-bold text-[#332E2A] dark:text-white">Latest evidence by skill</h2></div><span className="text-xs text-[#91877F] dark:text-[#9d8aaa]">{records.length} attempt{records.length === 1 ? "" : "s"}</span></div>
          <div className="mt-4 divide-y divide-[#E8E2D6] border-y border-[#E8E2D6] dark:divide-[#3a2347] dark:border-[#3a2347]">
            {summaries.map((summary) => (
              <button key={summary.skill} type="button" onClick={() => onStartSkill(summary.skill)} className="group grid w-full grid-cols-[1fr_auto] gap-4 py-5 text-left sm:grid-cols-[1fr_100px_120px_150px_auto] sm:items-center">
                <span><strong className="block text-base text-[#35312F] dark:text-white">{PRACTICE_SKILL_LABELS[summary.skill]}</strong><span className="mt-1 block text-xs text-[#8A817C] dark:text-[#9d8aaa]">{summary.attempts ? `${summary.attempts} attempt${summary.attempts === 1 ? "" : "s"} · ${dateLabel(summary.lastPracticedAt)}` : "Build your baseline"}</span></span>
                <strong className="text-2xl text-[#2B6257] dark:text-[#9ddad0]">{score(summary.latestBand)}</strong>
                <span className="hidden text-xs sm:block"><Trend value={summary.trend} /></span>
                <span className="hidden text-sm text-[#6D645F] dark:text-[#c5b5ce] sm:block"><span className="text-xs text-[#968B84] dark:text-[#8e7b9b]">Focus</span><br />{summary.weakness}</span>
                <ArrowRight size={17} className="self-center text-[#B5A48B] transition-transform group-hover:translate-x-1" />
              </button>
            ))}
          </div>
        </section>

        <section className="mt-9 grid gap-7 border-b border-[#E8E2D6] pb-9 dark:border-[#3a2347] md:grid-cols-[1.25fr_0.75fr]">
          <div className="bg-[#EAF5F2] px-5 py-6 dark:bg-[#17303a] sm:px-7">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#267066] dark:text-[#9ddad0]"><BarChart3 size={16} /> Next practice</div>
            <h2 className="mt-3 font-display text-2xl font-semibold text-[#274E48] dark:text-white">{PRACTICE_SKILL_LABELS[recommendation.skill]}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[#4F6D68] dark:text-[#b9d7d1]">{recommendation.reason}</p>
            <button type="button" onClick={() => onStartSkill(recommendation.skill)} className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#173F39] px-5 text-sm font-bold text-white hover:bg-[#22594f] dark:bg-[#f2d276] dark:text-[#2c2430]">Start {PRACTICE_SKILL_LABELS[recommendation.skill]} <ArrowRight size={16} /></button>
          </div>
          <div className="border-l-0 border-[#E8E2D6] md:border-l md:pl-7 dark:border-[#3a2347]">
            <p className="text-xs font-bold uppercase tracking-widest text-[#A16E28] dark:text-[#d6bdec]">Baseline</p>
            <p className="mt-3 text-4xl font-semibold text-[#342F2C] dark:text-white">{completedSkills}/4</p>
            <p className="mt-2 text-sm leading-6 text-[#756C66] dark:text-[#bda9ca]">{completedSkills === 4 ? "skills measured. Your baseline is complete; repeat each skill to make the trends more reliable." : "skills measured. Complete all four before treating the average as a useful baseline."}</p>
          </div>
        </section>

        <p className="mt-5 text-xs leading-5 text-[#9A8F88] dark:text-[#8e7b9b]">Practice estimates are learning signals, not official IELTS results.</p>
      </motion.div>
    </main>
  );
}


