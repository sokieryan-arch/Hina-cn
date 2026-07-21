import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Send, X } from "lucide-react";
import { motion } from "motion/react";
import { nanoid } from "nanoid";
import { ApiError, api } from "./api/client.js";
import { AppHeader, type AppView } from "./components/AppHeader.js";
import { AuthPanel } from "./components/AuthPanel.js";
import { ChatMessage } from "./components/ChatMessage.js";
import { SettingsModal } from "./components/SettingsModal.js";
import { pickChatPlaceholder } from "./i18n/chatPlaceholder.js";
import { ambientPresence, resolvePresence } from "./lib/presence.js";
import type { BillingSummary, CurrentUser, Message, ProactiveSettings, WishlistSuggestion } from "./shared/types.js";

const HinaSpace = lazy(() => import("./components/HinaSpace.js").then((module) => ({ default: module.HinaSpace })));

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
  return (error.data as { billing?: BillingSummary })?.billing ?? null;
}

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function App() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [chatPlaceholder] = useState(() => pickChatPlaceholder());
  const [activity, setActivity] = useState<"ambient" | "preparing" | "thinking">("ambient");
  const [ambient, setAmbient] = useState(() => ambientPresence());
  const [theme, setTheme] = useState<"light" | "dark">(() => loadTheme());
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [view, setView] = useState<AppView>("chat");
  const [wishlistSuggestion, setWishlistSuggestion] = useState<WishlistSuggestion | null>(null);
  const [proactiveSettings, setProactiveSettings] = useState<ProactiveSettings>(DEFAULT_PROACTIVE_SETTINGS);
  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isGenerating = activity !== "ambient";
  const presence = resolvePresence({
    ambient,
    preparing: activity === "preparing",
    thinking: activity === "thinking",
    speaking: Boolean(speakingMessageId),
  });

  useEffect(() => {
    api.me().then((result) => setUser(result.user)).finally(() => setIsAuthReady(true));
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const timer = window.setInterval(() => setAmbient(ambientPresence()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
  }, []);

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
    if (view === "chat") messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating, view]);

  useEffect(() => {
    if (!user || !proactiveSettings.enabled || messages.length === 0) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.checkProactive();
        if (result.due && result.message) setMessages((current) => [...current, result.message!]);
      } catch (error) {
        console.error("Failed proactive check:", error);
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [messages.length, proactiveSettings.enabled, user]);

  const recentPlainMessages = useMemo(
    () => messages
      .filter((message) => !message.isTyping && message.text && message.type !== "tip")
      .slice(-10)
      .map((message) => ({ role: message.role, text: message.text })),
    [messages],
  );

  const playAudio = useCallback(async (text: string, messageId: string) => {
    try {
      audioRef.current?.pause();
      audioRef.current = null;
      setSpeakingMessageId(messageId);
      const data = await api.tts(text);
      if (!data?.audio) {
        setSpeakingMessageId(null);
        return;
      }
      const audio = new Audio(`data:${data.mimeType};base64,${data.audio}`);
      audioRef.current = audio;
      audio.onended = () => setSpeakingMessageId(null);
      audio.onerror = () => setSpeakingMessageId(null);
      await audio.play();
    } catch (error) {
      console.error(error);
      setSpeakingMessageId(null);
    }
  }, []);

  const handleSend = async () => {
    if (!inputValue.trim() || isGenerating || !user) return;
    const userText = inputValue.trim();
    setInputValue("");
    setWishlistSuggestion(null);
    setMessages((current) => [...current, {
      id: nanoid(),
      role: "user",
      text: userText,
      timestamp: Date.now(),
      type: "response",
    }]);
    setActivity("preparing");

    let settled = false;
    const request = api.chat([...recentPlainMessages, { role: "user" as const, text: userText }]);
    request.then(() => { settled = true; }, () => { settled = true; });

    try {
      await wait(700);
      if (!settled) setActivity("thinking");
      const result = await request;
      setMessages((current) => [...current, ...result.messages]);
      setBilling(result.billing);
      setWishlistSuggestion(result.wishlistSuggestion ?? null);
      const response = result.messages.find((message) => message.type === "response");
      setActivity("ambient");
      if (response) void playAudio(response.text, response.id);
    } catch (error) {
      setActivity("ambient");
      const quotaBilling = billingFromError(error);
      if (quotaBilling) setBilling(quotaBilling);
      setMessages((current) => [...current, {
        id: nanoid(),
        role: "model",
        text: chatError(error),
        type: "response",
        timestamp: Date.now(),
      }]);
    }
  };

  const acceptWishlistSuggestion = async () => {
    if (!wishlistSuggestion) return;
    await api.createWishlist(wishlistSuggestion);
    setWishlistSuggestion(null);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setMessages([]);
    setBilling(null);
    setView("chat");
  };

  const goBack = () => setView((current) => current === "space" ? "chat" : "space");

  if (!isAuthReady) return <div className="min-h-screen bg-[#FDFBF7] dark:bg-[#1c1224]" />;
  if (!user) return <AuthPanel onAuthed={setUser} />;

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 ${theme} bg-[#FDFBF7] dark:bg-[#1c1224] text-[#4A4A4A] dark:text-[#e5dceb] selection:bg-[#FFD166]/30`}>
      <AppHeader
        view={view}
        theme={theme}
        presence={presence}
        isSpeaking={Boolean(speakingMessageId)}
        onOpenSpace={() => setView("space")}
        onBack={goBack}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {view !== "chat" ? (
        <Suspense fallback={<div className="flex-1 bg-[#FDFBF7] dark:bg-[#1c1224]" />}>
          <HinaSpace view={view} onNavigate={setView} />
        </Suspense>
      ) : (
        <>
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
                {isGenerating && (
                  <ChatMessage message={{ id: "typing", role: "model", text: "", timestamp: Date.now(), isTyping: true }} theme={theme} />
                )}
                {wishlistSuggestion && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="ml-16 mb-6 max-w-[650px] rounded-[20px] border border-[#F0DDA9] bg-[#FFF9E9] dark:border-[#4b3a55] dark:bg-[#2d2136] px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[#A27622] dark:text-[#e0c47b]">A tiny idea for our list</p>
                        <p className="mt-1 text-sm font-semibold text-[#4A443E] dark:text-white">{wishlistSuggestion.title}</p>
                        {wishlistSuggestion.details && <p className="mt-1 text-xs leading-5 text-[#7C746F] dark:text-[#b9a8c5]">{wishlistSuggestion.details}</p>}
                        <button type="button" onClick={acceptWishlistSuggestion} className="mt-3 rounded-full bg-[#5A5A40] dark:bg-[#48285c] px-4 py-2 text-xs font-bold text-white shadow-sm transition-transform hover:-translate-y-0.5">Add to Wishlist</button>
                      </div>
                      <button type="button" onClick={() => setWishlistSuggestion(null)} className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-black/5 dark:hover:bg-white/10" title="Not now"><X size={15} /></button>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} className="h-1 py-1" />
              </div>
            </div>
          </div>

          <div className="flex-none bg-white dark:bg-[#1c1224] p-4 sm:p-6 border-t border-[#E8E2D6] dark:border-[#3a2347]">
            <div className="max-w-3xl mx-auto relative flex items-center bg-[#F7F2E9] dark:bg-[#291a33] rounded-[28px] p-1.5 ring-1 ring-[#E8E2D6] dark:ring-[#3a2347] shadow-inner focus-within:ring-2 focus-within:ring-[#B5A48B]" data-chat-composer>
              <textarea
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder={chatPlaceholder}
                aria-label="Message Hina"
                className="flex-1 h-10 min-h-10 max-h-10 overflow-y-auto bg-transparent border-0 resize-none py-2.5 px-4 focus:outline-none text-[15px] leading-5 placeholder:whitespace-nowrap placeholder:text-[14px] placeholder:transition-opacity focus:placeholder:opacity-0 placeholder-[#B5A48B] dark:placeholder-[#89739c] text-[#4A4A4A] dark:text-[#e5dceb]"
                rows={1}
                disabled={isGenerating}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={!inputValue.trim() || isGenerating}
                className="w-10 h-10 shrink-0 ml-1.5 bg-[#FF9F1C] dark:bg-[#660874] text-white hover:scale-105 transition-transform disabled:bg-[#E8E2D6] dark:disabled:bg-[#301f3b] disabled:text-[#B5A48B] disabled:hover:scale-100 rounded-full flex items-center justify-center shadow-md disabled:shadow-none"
                title="Send"
              >
                <Send size={18} className="-ml-0.5" />
              </button>
            </div>
          </div>
        </>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        billing={billing}
        onUserChange={setUser}
        onBillingChange={setBilling}
        onClearHistory={() => setMessages([greeting()])}
        proactiveSettings={proactiveSettings}
        onProactiveSettingsChange={setProactiveSettings}
        theme={theme}
        onThemeChange={setTheme}
        onLogout={logout}
      />
    </div>
  );
}
