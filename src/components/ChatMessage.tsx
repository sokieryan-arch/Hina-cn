import { CheckCircle2, Lightbulb, MessageCircle, Moon, Sun, UserCircle, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import type { Message } from "../shared/types.js";
import { cn } from "../lib/utils.js";
import { withAppBase } from "../lib/appPath.js";

interface ChatMessageProps {
  message: Message;
  isSpeaking?: boolean;
  onPlayAudio?: () => void;
  userPhotoUrl?: string | null;
  theme?: "light" | "dark";
}

export function ChatMessage({ message, isSpeaking, onPlayAudio, userPhotoUrl, theme = "light" }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTip = message.type === "tip";
  const isCorrectionTip = isTip && message.tipKind === "correction";
  const isExpressionTip = isTip && message.tipKind !== "correction";
  const ThemeAvatarIcon = theme === "dark" ? Moon : Sun;
  const themedAvatarName = theme === "dark" ? "moon" : "sun";

  if (message.isTyping) {
    return (
      <div className="flex w-full mt-6 gap-4 max-w-[80%]">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center shadow-sm bg-[#FFD166] text-white"
          data-hina-avatar={themedAvatarName}
        >
          <ThemeAvatarIcon size={24} strokeWidth={2.5} />
        </div>
        <div className="bg-white dark:bg-[#291a33] p-4 rounded-[22px] rounded-tl-lg shadow-sm border border-[#F0EADF] dark:border-[#3a2347]">
          <div className="flex space-x-1.5 h-6 items-center px-1">
            {[0, 0.2, 0.4].map((delay) => (
              <motion.div
                key={delay}
                className="w-1.5 h-1.5 bg-[#B5A48B] dark:bg-[#a58ebd] rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  let bgClass = "bg-[#5A5A40] dark:bg-[#48285c] text-white p-4 rounded-[22px] rounded-tr-lg shadow-md";
  if (!isUser) {
    if (isCorrectionTip) {
      bgClass = "bg-[#FDF2E9] dark:bg-[#3d1928] text-[#93522C] dark:text-[#ffb0ca] p-4 rounded-[22px] shadow-sm border border-[#FBD7BB] dark:border-[#6b2542]";
    } else if (isTip) {
      bgClass = "bg-[#EAF4F2] dark:bg-[#182a45] text-[#2F5D54] dark:text-[#9fc7ff] p-3 rounded-[22px] shadow-sm border border-[#C5E1DB] dark:border-[#24426e]";
    } else {
      bgClass = "bg-white dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] p-4 rounded-[22px] rounded-tl-lg shadow-sm border border-[#F0EADF] dark:border-[#3a2347]";
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("flex w-full mt-6 gap-4 max-w-[80%]", isUser && "ml-auto flex-row-reverse")}
    >
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-10 h-10 rounded-full bg-[#5A5A40] dark:bg-[#48285c] flex items-center justify-center text-white shadow-sm overflow-hidden">
            {userPhotoUrl ? <img src={withAppBase(userPhotoUrl)} alt="User" className="w-full h-full object-cover" /> : <UserCircle size={22} />}
          </div>
        ) : (
          <motion.div
            animate={isSpeaking ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
            transition={isSpeaking ? { duration: 0.6, repeat: Infinity } : {}}
            data-hina-avatar={
              isCorrectionTip
                ? "correction"
                : isExpressionTip
                  ? "expression"
                  : message.type === "proactive"
                    ? "proactive"
                    : themedAvatarName
            }
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-sm overflow-hidden",
              isTip ? "bg-[#FFD166] dark:bg-[#660874] text-black dark:text-white" : "bg-[#FFD166] text-white",
            )}
          >
            {isTip ? (isCorrectionTip ? <CheckCircle2 size={22} /> : <Lightbulb size={22} />) : message.type === "proactive" ? <MessageCircle size={22} /> : <ThemeAvatarIcon size={24} strokeWidth={2.5} />}
          </motion.div>
        )}
      </div>

      <div className="space-y-2">
        <div className={cn("relative text-[15px] leading-relaxed font-sans group", bgClass)}>
          {isCorrectionTip && <p className="text-sm font-medium mb-1 italic">Just a tiny tip...</p>}
          {isExpressionTip && (
            <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">
              {message.tipKind === "culture" ? "Culture Note" : "Quick Expression"}
            </p>
          )}
          {message.type === "proactive" && <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">Hina popped in</p>}
          <div className="whitespace-pre-wrap">{message.text}</div>
          {!isUser && onPlayAudio && !isTip && (
            <button
              onClick={onPlayAudio}
              className={cn(
                "absolute -right-8 bottom-0 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100",
                isSpeaking && "text-[#FF9F1C] dark:text-[#a58ebd] opacity-100",
              )}
              title="Play AI Voice"
            >
              <Volume2 size={16} />
            </button>
          )}
        </div>
        {!isUser && (message.type === "response" || message.type === "proactive") && (
          <p className="text-[10px] text-[#B5A48B] dark:text-[#89739c] font-bold uppercase tracking-wider ml-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </motion.div>
  );
}
