import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, Clock, Image as ImageIcon, Settings, Sparkles, Trash2, User, X } from "lucide-react";
import type { CurrentUser, ProactiveSettings } from "../shared/types.js";
import { api } from "../api/client.js";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CurrentUser;
  proactiveSettings: ProactiveSettings;
  onUserChange: (user: CurrentUser) => void;
  onClearHistory: () => void;
  onProactiveSettingsChange: (settings: ProactiveSettings) => void;
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  proactiveSettings,
  onUserChange,
  onClearHistory,
  onProactiveSettingsChange,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [topicText, setTopicText] = useState(proactiveSettings.favoriteTopics.join(", "));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(user.displayName);
    setAvatarUrl(user.avatarUrl ?? "");
    setTopicText(proactiveSettings.favoriteTopics.join(", "));
  }, [isOpen, proactiveSettings.favoriteTopics, user.avatarUrl, user.displayName]);

  const updateProactiveSettings = async (patch: Partial<ProactiveSettings>) => {
    const next = { ...proactiveSettings, ...patch };
    onProactiveSettingsChange(next);
    const result = await api.saveProactiveSettings(next);
    onProactiveSettingsChange(result.settings);
  };

  const saveProfile = async () => {
    setBusy(true);
    try {
      const result = await api.updateProfile({
        displayName,
        avatarUrl: avatarUrl.trim() || null,
      });
      onUserChange(result.user);
    } finally {
      setBusy(false);
    }
  };

  const clearHistory = async () => {
    if (!confirm("Delete all Hina chat history?")) return;
    setBusy(true);
    try {
      await api.clearMessages();
      onClearHistory();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md max-h-[88vh] bg-white dark:bg-[#1c1224] rounded-3xl shadow-xl z-50 overflow-y-auto border border-[#E8E2D6] dark:border-[#3a2347]"
          >
            <div className="flex items-center justify-between p-5 border-b border-[#E8E2D6] dark:border-[#3a2347] bg-[#FDFBF7] dark:bg-[#291a33]">
              <h2 className="text-lg font-bold text-[#2D2D2D] dark:text-white flex items-center gap-2">
                <Settings size={20} className="text-[#FF9F1C]" />
                Settings
              </h2>
              <button onClick={onClose} className="p-1.5 text-[#8A817C] hover:bg-[#E8E2D6] dark:hover:bg-[#3a2347] rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                  <User size={16} />
                  Display Name
                </label>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                />
                <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                  <ImageIcon size={16} />
                  Avatar URL
                </label>
                <input
                  value={avatarUrl}
                  onChange={(event) => setAvatarUrl(event.target.value)}
                  placeholder="https://example.com/avatar.png"
                  className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                />
                <div className="flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={busy}
                    className="bg-[#2D2D2D] dark:bg-[#660874] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    Save Profile
                  </button>
                </div>
              </div>

              <div className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                    <Bell size={16} />
                    Proactive Nudges
                  </label>
                  <button
                    type="button"
                    onClick={() => updateProactiveSettings({ enabled: !proactiveSettings.enabled })}
                    className={`w-12 h-7 rounded-full p-1 transition-colors ${proactiveSettings.enabled ? "bg-[#FF9F1C]" : "bg-[#E8E2D6] dark:bg-[#3a2347]"}`}
                    aria-pressed={proactiveSettings.enabled}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${proactiveSettings.enabled ? "translate-x-5" : "translate-x-0"}`} />
                  </button>
                </div>

                <label className="block space-y-2 text-sm text-[#4A4A4A] dark:text-[#e5dceb]">
                  <span className="font-bold flex items-center gap-2">
                    <Clock size={16} />
                    Minimum gap
                  </span>
                  <input
                    type="range"
                    min={6}
                    max={72}
                    step={1}
                    value={proactiveSettings.minHoursBetweenNudges}
                    onChange={(event) => updateProactiveSettings({ minHoursBetweenNudges: Number(event.target.value) })}
                    className="w-full accent-[#FF9F1C]"
                  />
                  <span className="text-xs text-[#8A817C]">{proactiveSettings.minHoursBetweenNudges} hours</span>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                    Quiet from
                    <input
                      type="time"
                      value={proactiveSettings.quietHoursStart}
                      onChange={(event) => updateProactiveSettings({ quietHoursStart: event.target.value })}
                      className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-3 py-2 outline-none border border-[#E8E2D6] dark:border-[#3a2347] text-sm"
                    />
                  </label>
                  <label className="space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                    Quiet until
                    <input
                      type="time"
                      value={proactiveSettings.quietHoursEnd}
                      onChange={(event) => updateProactiveSettings({ quietHoursEnd: event.target.value })}
                      className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-3 py-2 outline-none border border-[#E8E2D6] dark:border-[#3a2347] text-sm"
                    />
                  </label>
                </div>

                <label className="block space-y-2 text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb]">
                  <span className="flex items-center gap-2">
                    <Sparkles size={16} />
                    Favorite topics
                  </span>
                  <input
                    value={topicText}
                    onChange={(event) => setTopicText(event.target.value)}
                    onBlur={() => updateProactiveSettings({
                      favoriteTopics: topicText.split(",").map((topic) => topic.trim()).filter(Boolean).slice(0, 3),
                    })}
                    placeholder="films, food, IELTS"
                    className="w-full bg-[#F7F2E9] dark:bg-[#291a33] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                  />
                </label>
              </div>

              <div className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6">
                <button
                  onClick={clearHistory}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-3 rounded-xl font-medium border border-red-100 dark:border-red-900/30 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Clear Cloud History
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
