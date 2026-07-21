import { ArrowLeft, Moon, Settings, Sun } from "lucide-react";
import { motion } from "motion/react";
import { PRESENCE_DEFINITIONS, type PresenceStatus } from "../lib/presence.js";

export type AppView = "chat" | "space" | "moments" | "notes" | "wishlist" | "relationship";

const VIEW_TITLES: Record<Exclude<AppView, "chat">, string> = {
  space: "🪐 Hina's Space",
  moments: "📸 Hina's Moments",
  notes: "✍️ Hina's Notes",
  wishlist: "🎒 Hina's List",
  relationship: "❤️Between us",
};

interface AppHeaderProps {
  view: AppView;
  theme: "light" | "dark";
  presence: PresenceStatus;
  isSpeaking: boolean;
  onOpenSpace: () => void;
  onBack: () => void;
  onOpenSettings: () => void;
}

export function AppHeader({
  view,
  theme,
  presence,
  isSpeaking,
  onOpenSpace,
  onBack,
  onOpenSettings,
}: AppHeaderProps) {
  const HinaIcon = theme === "dark" ? Moon : Sun;
  const definition = PRESENCE_DEFINITIONS[presence];

  return (
    <header className="flex-none border-b border-[#E8E2D6] dark:border-[#3a2347] px-4 py-3 sm:px-8 flex items-center justify-between bg-white/70 dark:bg-[#1c1224]/85 backdrop-blur-sm z-20 sticky top-0 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)]">
      {view === "chat" ? (
        <button
          type="button"
          onClick={onOpenSpace}
          className="group flex items-center gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C]"
          title="Open Hina's Space"
        >
          <motion.span
            animate={isSpeaking ? { scale: [1, 1.12, 1], rotate: [-2, 2, -2] } : { scale: 1 }}
            transition={isSpeaking ? { duration: 0.6, repeat: Infinity } : { duration: 0.2 }}
            className="w-12 h-12 rounded-full border-2 border-white dark:border-[#1c1224] shadow-sm flex items-center justify-center overflow-hidden bg-[#FFD166] text-white group-hover:shadow-md transition-shadow"
            data-hina-avatar={theme === "dark" ? "moon" : "sun"}
          >
            <HinaIcon size={28} strokeWidth={2.5} />
          </motion.span>
          <span>
            <span className="block font-bold text-lg text-[#2D2D2D] dark:text-white leading-tight tracking-normal">Hina</span>
            <span className={`text-xs font-medium flex items-center mt-0.5 ${definition.textClass}`}>
              {definition.showsIndicator && <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${definition.dotClass}`} />}
              {definition.label}
            </span>
          </span>
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="h-10 w-10 shrink-0 rounded-full text-[#7C746F] dark:text-[#bda9ca] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] flex items-center justify-center"
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="truncate text-base sm:text-lg font-bold text-[#2D2D2D] dark:text-white tracking-normal">
            {VIEW_TITLES[view]}
          </h1>
        </div>
      )}

      <button
        type="button"
        onClick={onOpenSettings}
        className="h-10 w-10 shrink-0 rounded-full text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] flex items-center justify-center"
        title="Settings"
      >
        <Settings size={21} />
      </button>
    </header>
  );
}
