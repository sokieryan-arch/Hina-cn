import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LogOut, Moon, Send, Settings, Sun } from "lucide-react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { ApiError, api } from "./api/client.js";
import { AuthPanel } from "./components/AuthPanel.js";
import { ChatMessage } from "./components/ChatMessage.js";
import { SettingsModal } from "./components/SettingsModal.js";
import type { BillingSummary, CurrentUser, Message, ProactiveSettings } from "./shared/types.js";

const DEFAULT_PROACTIVE_SETTINGS: ProactiveSettings = {
  enabled: false,
  minHoursBetweenNudges: 20,
  quietHoursStart: "22:00",
  quietHoursEnd: "08:00",
  favoriteTopics: [],
};

const THEME_STORAGE_KEY = "hina.theme";

function loadTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
}

function greeting(): Message {
  return {
    id: nanoid(),
    role: "model",
    text: "Hey there! I just saw someone on the subway reading Plato while guarding a tiny lizard. What kind of side quest is your day giving you?",
    type: "response",
    timestamp: Date.now(),
  };
}

function chatError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const map: Record<string, string> = {
    auth_required: "Please log in again before chatting with Hina.",
    missing_ark_api_key: "Hina's server is missing ARK_API_KEY.",
    missing_ark_chat_model: "Hina's server is missing ARK_CHAT_MODEL.",
    rate_limited: "Tiny pause. Hina needs a sip of tea before the next reply.",
    quota_exceeded: "Today's free chats are used up. Pro is coming soon.",
  };
  return map[message] ?? `I hit a snag on my side (${message || "chat_failed"}). Try me again in a moment?`;
}

function billingFromError(error: unknown): BillingSummary | null {
  if (!(error instanceof ApiError) || error.message !== "quota_exceeded") return null;
  const billing = (error.data as { billing?: BillingSummary })?.billing;
  return billing ?? null;
}

function billingLabel(billing: BillingSummary | null) {
  if (!billing) return "Loading plan...";
  if (billing.isPro) return "Pro - unlimited chats";
  return `Free - ${billing.usedToday}/${billing.dailyLimit} chats today`;
}

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => loadTheme());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(DEFAULT_PROACTIVE_SETTINGS);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [quotaNotice, setQuotaNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    api.me()
      .then((result) => setUser(result.user))
      .finally(() => setIsAuthReady(true));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const loadUserData = useCallback(async () => {
    if (!user) {
      setMessages([]);
      setBilling(null);
      return;
    }
    const [messageResult, settingsResult, billingResult] = await Promise.all([
      api.messages(),
      api.getProactiveSettings(),
      api.billingMe(),
    ]);
    setMessages(messageResult.messages.length > 0 ? messageResult.messages : [greeting()]);
    setProactiveSettings(settingsResult.settings);
    setBilling(billingResult.billing);
  }, [user]);

  useEffect(() => {
    if (!isAuthReady || !user) return;
    loadUserData().catch((error) => console.error(error));
  }, [isAuthReady, loadUserData, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    if (!user || !proactiveSettings.enabled || messages.length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.checkProactive();
        if (result.due && result.message) {
          setMessages((prev) => [...prev, result.message!]);
        }
      } catch (error) {
        console.error("Failed proactive check:", error);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [messages.length, proactiveSettings.enabled, user]);

  const recentPlainMessages = useMemo(
    () => messages
      .filter((message) => !message.isTyping && message.text)
      .slice(-10)
      .map((message) => ({ role: message.role, text: message.text })),
    [messages],
  );

  const playAudio = useCallback(async (text: string, messageId: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeakingMessageId(messageId);
      const data = await api.tts(text);
      if (!data?.audio) {
        setSpeakingMessageId(null);
        return;
      }
      const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setSpeakingMessageId(null);
      await audio.play();
    } catch (error) {
      console.error(error);
      setSpeakingMessageId(null);
    }
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isTyping || !user) return;
    if (billing?.remainingToday === 0) {
      setQuotaNotice("Free chats are used today. Pro is coming soon.");
      return;
    }

    const userText = inputValue.trim();
    setInputValue("");
    setQuotaNotice(null);
    const userMsg: Message = {
      id: nanoid(),
      role: "user",
      text: userText,
      timestamp: Date.now(),
      type: "response",
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const result = await api.chat([...recentPlainMessages, { role: "user", text: userText }]);
      setIsTyping(false);
      setMessages((prev) => [...prev, ...result.messages]);
      setBilling(result.billing);
      const response = result.messages.find((message) => message.type === "response");
      if (response) playAudio(response.text, response.id);
    } catch (error) {
      setIsTyping(false);
      const quotaBilling = billingFromError(error);
      if (quotaBilling) {
        setBilling(quotaBilling);
        setQuotaNotice("Free chats are used today. Pro is coming soon.");
        return;
      }
      setMessages((prev) => [...prev, {
        id: nanoid(),
        role: "model",
        text: chatError(error),
        type: "response",
        timestamp: Date.now(),
      }]);
    }
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setMessages([]);
    setBilling(null);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1c1224]" />;
  }

  if (!user) {
    return <AuthPanel onAuthed={setUser} />;
  }

  const HinaHeaderIcon = theme === "dark" ? Moon : Sun;
  const quotaExhausted = billing?.remainingToday === 0;

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme} bg-[#FDFBF7] dark:bg-[#1c1224] text-[#4A4A4A] dark:text-[#e5dceb] selection:bg-[#FFD166]/30`}>
      <header className="flex-none border-b border-[#E8E2D6] dark:border-[#3a2347] px-4 py-3 sm:px-8 flex items-center justify-between bg-white/50 dark:bg-[#1c1224]/80 backdrop-blur-sm z-10 sticky top-0 shadow-[0_1px_2px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex items-center gap-3">
          <motion.div
            animate={speakingMessageId ? { scale: [1, 1.15, 1], rotate: [-2, 2, -2] } : {}}
            transition={speakingMessageId ? { duration: 0.6, repeat: Infinity } : {}}
            className="w-12 h-12 rounded-full border-2 border-white dark:border-[#1c1224] shadow-sm flex items-center justify-center overflow-hidden bg-[#FFD166] text-white"
            data-hina-avatar={theme === "dark" ? "moon" : "sun"}
          >
            <HinaHeaderIcon size={28} strokeWidth={2.5} />
          </motion.div>
          <div>
            <h1 className="font-bold text-lg text-[#2D2D2D] dark:text-white leading-tight tracking-normal">Hina</h1>
            <p className="text-xs text-[#8A817C] dark:text-[#a58ebd] font-medium flex items-center mt-0.5">
              <span className={`w-2 h-2 rounded-full inline-block mr-1.5 ${isTyping ? "bg-[#06D6A0]" : speakingMessageId ? "bg-[#FF9F1C]" : "bg-gray-300 dark:bg-[#4b305e]"}`} />
              {isTyping ? "Hina is thinking..." : speakingMessageId ? "Hina is speaking..." : "Online"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={logout} className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full" title="Logout">
            <LogOut size={20} />
          </button>
          <button onClick={() => setTheme(theme === "light" ? "dark" : "light")} className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full" title="Toggle theme">
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-[#8A817C] dark:text-[#a58ebd] hover:bg-[#F7F2E9] dark:hover:bg-[#342042] rounded-full" title="Settings">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="max-w-3xl mx-auto flex flex-col justify-end min-h-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center space-x-2 bg-[#F7F2E9] dark:bg-[#342042] text-[#B5A48B] dark:text-[#d6bdec] border-[#E8E2D6] dark:border-[#4b305e] text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full border">
              <span>Your English Learning Partner</span>
            </div>
            <p className="text-[#8A817C] dark:text-[#89739c] text-xs mt-3 opacity-60 font-medium">Hina can make mistakes. Consider verifying important information.</p>
          </div>

          <div className="flex flex-col pb-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isSpeaking={speakingMessageId === message.id}
                onPlayAudio={() => playAudio(message.text, message.id)}
                userPhotoUrl={user.avatarUrl}
                theme={theme}
              />
            ))}
            {isTyping && (
              <ChatMessage
                message={{ id: "typing", role: "model", text: "", timestamp: Date.now(), isTyping: true }}
                theme={theme}
              />
            )}
            <div ref={messagesEndRef} className="h-1 py-1" />
          </div>
        </div>
      </div>

      <div className="flex-none bg-white dark:bg-[#1c1224] p-4 sm:p-6 border-t border-[#E8E2D6] dark:border-[#3a2347]">
        <div className="max-w-3xl mx-auto mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-semibold ${
            quotaExhausted
              ? "border-[#E9A8A8] bg-[#FFF0F0] text-[#9F3A3A] dark:border-[#6b2945] dark:bg-[#351827] dark:text-[#ffb7c8]"
              : "border-[#E8E2D6] bg-[#FDFBF7] text-[#8A817C] dark:border-[#3a2347] dark:bg-[#291a33] dark:text-[#cdb6dd]"
          }`}
          >
            <span className={`h-2 w-2 rounded-full ${quotaExhausted ? "bg-[#E76F51]" : "bg-[#06D6A0]"}`} />
            {billingLabel(billing)}
          </div>
          {quotaNotice && (
            <span className="text-[#9F3A3A] dark:text-[#ffb7c8] font-medium">{quotaNotice}</span>
          )}
        </div>
        <div className="max-w-3xl mx-auto relative flex items-center bg-[#F7F2E9] dark:bg-[#291a33] rounded-[32px] p-2 pr-2 ring-1 ring-[#E8E2D6] dark:ring-[#3a2347] shadow-inner focus-within:ring-2 focus-within:ring-[#B5A48B]">
          <textarea
            value={inputValue}
            onChange={(event) => {
              setInputValue(event.target.value);
              if (!quotaExhausted) setQuotaNotice(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
              }
            }}
            placeholder={quotaExhausted ? "Today's free chats are used. Pro is coming soon." : "Reply to Hina in English (or Chinese if you're tired!)"}
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 resize-none py-3 px-4 focus:outline-none text-[15px] block leading-relaxed placeholder-[#B5A48B] dark:placeholder-[#89739c] text-[#4A4A4A] dark:text-[#e5dceb]"
            rows={1}
            disabled={isTyping || quotaExhausted}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping || quotaExhausted}
            className="w-11 h-11 shrink-0 ml-2 bg-[#FF9F1C] dark:bg-[#660874] text-white hover:scale-105 transition-transform disabled:bg-[#E8E2D6] dark:disabled:bg-[#301f3b] disabled:text-[#B5A48B] disabled:hover:scale-100 rounded-full flex items-center justify-center shadow-md disabled:shadow-none"
            title="Send"
          >
            <Send size={18} className="-ml-0.5" />
          </button>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUserChange={setUser}
        onClearHistory={() => setMessages([greeting()])}
        proactiveSettings={proactiveSettings}
        onProactiveSettingsChange={setProactiveSettings}
      />
    </div>
  );
}
