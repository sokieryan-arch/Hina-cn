import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  CheckCircle2,
  Clock,
  Crown,
  Image as ImageIcon,
  Settings,
  Sparkles,
  Trash2,
  Upload,
  User,
  X,
  Zap,
} from "lucide-react";
import type { BillingSummary, CurrentUser, ProactiveSettings } from "../shared/types.js";
import { ApiError, api } from "../api/client.js";

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: CurrentUser;
  billing: BillingSummary | null;
  proactiveSettings: ProactiveSettings;
  onUserChange: (user: CurrentUser) => void;
  onBillingChange: (billing: BillingSummary) => void;
  onClearHistory: () => void;
  onProactiveSettingsChange: (settings: ProactiveSettings) => void;
}

function formatUsage(billing: BillingSummary | null) {
  if (!billing) return "Loading usage...";
  if (billing.isPro) return "Unlimited chats unlocked";
  return `${billing.usedToday}/${billing.dailyLimit ?? 30} chats used today`;
}

function usagePercent(billing: BillingSummary | null) {
  if (!billing) return 0;
  if (billing.isPro) return 100;
  const limit = billing.dailyLimit ?? 30;
  return Math.min(100, Math.round((billing.usedToday / limit) * 100));
}

function avatarErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    const messages: Record<string, string> = {
      avatar_too_large: "Avatar must be 10MB or smaller.",
      avatar_type_not_supported: "Choose a JPG, PNG, WebP, or GIF image.",
      missing_avatar_file: "Pick an image before saving.",
    };
    return messages[error.message] ?? error.message;
  }
  return error instanceof Error ? error.message : "Profile update failed.";
}

export function SettingsModal({
  isOpen,
  onClose,
  user,
  billing,
  proactiveSettings,
  onUserChange,
  onBillingChange,
  onClearHistory,
  onProactiveSettingsChange,
}: SettingsModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatarUrl ?? null);
  const [topicText, setTopicText] = useState(proactiveSettings.favoriteTopics.join(", "));
  const [busy, setBusy] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(user.displayName);
    setAvatarFile(null);
    setAvatarPreview(user.avatarUrl ?? null);
    setTopicText(proactiveSettings.favoriteTopics.join(", "));
    setProfileMessage(null);
    setBillingMessage(null);
  }, [isOpen, proactiveSettings.favoriteTopics, user.avatarUrl, user.displayName]);

  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const updateProactiveSettings = async (patch: Partial<ProactiveSettings>) => {
    const next = { ...proactiveSettings, ...patch };
    onProactiveSettingsChange(next);
    const result = await api.saveProactiveSettings(next);
    onProactiveSettingsChange(result.settings);
  };

  const chooseAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setAvatarFile(null);
      setProfileMessage("Choose a JPG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarFile(null);
      setProfileMessage("Avatar must be 10MB or smaller.");
      return;
    }

    const preview = URL.createObjectURL(file);
    setAvatarFile(file);
    setAvatarPreview(preview);
    setProfileMessage("New avatar ready. Save profile to upload it.");
  };

  const saveProfile = async () => {
    setBusy(true);
    setProfileMessage(null);
    try {
      let nextUser = (await api.updateProfile({
        displayName: displayName.trim() || user.displayName,
      })).user;

      if (avatarFile) {
        nextUser = (await api.uploadAvatar(avatarFile)).user;
        setAvatarFile(null);
        setAvatarPreview(nextUser.avatarUrl ?? null);
      }

      onUserChange(nextUser);
      setProfileMessage("Profile saved.");
    } catch (error) {
      setProfileMessage(avatarErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const startUpgrade = async () => {
    setBillingBusy(true);
    setBillingMessage(null);
    try {
      const checkout = await api.billingCheckout() as unknown as { billing?: BillingSummary; url?: string };
      if (checkout.billing) onBillingChange(checkout.billing);
      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }
      setBillingMessage("Upgrade is almost ready. Hina saved your spot on the tiny VIP list.");
    } catch (error) {
      if (error instanceof ApiError && error.message === "billing_not_ready") {
        setBillingMessage("Upgrade is almost ready. Hina saved your spot on the tiny VIP list.");
      } else {
        setBillingMessage("Upgrade could not start right now. Please try again later.");
      }
    } finally {
      setBillingBusy(false);
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

  const percent = usagePercent(billing);
  const isPro = billing?.isPro === true;

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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-lg max-h-[88vh] bg-white dark:bg-[#1c1224] rounded-3xl shadow-xl z-50 overflow-y-auto border border-[#E8E2D6] dark:border-[#3a2347]"
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
              <section className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-[#F7F2E9] dark:bg-[#291a33] border border-[#E8E2D6] dark:border-[#3a2347] overflow-hidden shadow-sm flex items-center justify-center text-[#B5A48B]">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="w-full h-full object-cover" />
                    ) : (
                      <User size={30} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <label className="text-sm font-bold text-[#4A4A4A] dark:text-[#e5dceb] flex items-center gap-2">
                      <User size={16} />
                      Display Name
                    </label>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      className="w-full bg-[#F7F2E9] dark:bg-[#291a33] text-[#4A4A4A] dark:text-[#e5dceb] rounded-xl px-4 py-2.5 outline-none border border-[#E8E2D6] dark:border-[#3a2347] focus:ring-2 focus:ring-[#FF9F1C] text-sm"
                    />
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  onChange={(event) => chooseAvatar(event.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#5A5A40] dark:bg-[#48285c] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:translate-y-[-1px] transition-transform"
                  >
                    <Upload size={16} />
                    Upload Avatar
                  </button>
                  <span className="text-xs text-[#8A817C] dark:text-[#a58ebd] flex items-center gap-1.5">
                    <ImageIcon size={14} />
                    JPG, PNG, WebP, GIF under 10MB
                  </span>
                </div>
                {profileMessage && (
                  <p className="text-xs font-medium text-[#7B5E3C] dark:text-[#d9c1ef] bg-[#FFF7E6] dark:bg-[#2b1b38] border border-[#F4D6A3] dark:border-[#4b305e] rounded-xl px-3 py-2">
                    {profileMessage}
                  </p>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={saveProfile}
                    disabled={busy}
                    className="bg-[#2D2D2D] dark:bg-[#660874] text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {busy ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </section>

              <section className="overflow-hidden rounded-2xl border border-[#D8E7DF] dark:border-[#27485a] bg-[#F3FAF7] dark:bg-[#102332]">
                <div className="flex items-start justify-between gap-4 p-5">
                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-[#2F5D54] dark:text-[#9fc7ff]">
                      <Crown size={14} />
                      {isPro ? "Hina Pro" : "Free Plan"}
                    </div>
                    <h3 className="text-xl font-bold text-[#223832] dark:text-white">More room for Hina to yap</h3>
                    <p className="text-sm leading-relaxed text-[#47625b] dark:text-[#b6d5e8]">
                      {formatUsage(billing)}
                    </p>
                  </div>
                  <div className="h-14 w-14 rounded-2xl bg-[#FFD166] text-[#2D2D2D] flex items-center justify-center shadow-sm">
                    <Zap size={24} />
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-4">
                  <div className="h-2 rounded-full bg-white/80 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#06D6A0] transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="grid gap-2 text-sm text-[#2F5D54] dark:text-[#c8e7ff]">
                    {["Unlimited daily chats", "More proactive Hina moments later", "Early access to tiny experimental features"].map((item) => (
                      <div key={item} className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-[#06A77D]" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={startUpgrade}
                    disabled={billingBusy || isPro}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#223832] px-4 py-3 text-sm font-bold text-white shadow-sm hover:translate-y-[-1px] transition-transform disabled:opacity-50 disabled:hover:translate-y-0"
                  >
                    <Crown size={16} />
                    {isPro ? "Pro Active" : billingBusy ? "Opening..." : "Upgrade"}
                  </button>
                  {billingMessage && (
                    <p className="text-xs font-medium text-[#47625b] dark:text-[#b6d5e8]">{billingMessage}</p>
                  )}
                </div>
              </section>

              <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6 space-y-4">
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
              </section>

              <section className="border-t border-[#E8E2D6] dark:border-[#3a2347] pt-6">
                <button
                  onClick={clearHistory}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 p-3 rounded-xl font-medium border border-red-100 dark:border-red-900/30 disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Clear Cloud History
                </button>
              </section>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
