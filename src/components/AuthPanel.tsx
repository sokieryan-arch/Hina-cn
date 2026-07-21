import { useState } from "react";
import { Mail, MessageCircle, Phone, RotateCcw, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../api/client.js";
import type { CurrentUser } from "../shared/types.js";
import { cn } from "../lib/utils.js";

type AuthMode = "login" | "register" | "reset";

interface AuthPanelProps {
  onAuthed: (user: CurrentUser) => void;
}

export function readableError(message: string) {
  const map: Record<string, string> = {
    invalid_credentials: "账号或密码不对。",
    already_registered: "这个账号已经注册过了。",
    invalid_verification_code: "验证码不对或已过期。",
    weak_password: "密码至少需要 8 位。",
    invalid_phone: "请输入中国大陆手机号。",
    invalid_email: "邮箱格式不太对。",
    user_not_found: "没有找到这个账号。",
    email_not_configured: "邮箱验证码还没有配置好，请稍后再试。",
    phone_verification_unavailable: "手机验证码暂未开放，请先使用邮箱注册。",
    missing_wechat_app_id: "微信登录还没有配置好。",
    missing_wechat_credentials: "微信登录还没有配置好。",
  };
  return map[message] ?? "请求没有成功，请稍后再试。";
}

export function AuthPanel({ onAuthed }: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  const sendCode = async () => {
    setBusy(true);
    setStatus("");
    try {
      const result = await api.sendCode(identifier, mode === "reset" ? "reset_password" : "register");
      setStatus(`验证码已发送到 ${result.maskedTarget}${result.devCode ? `，本地验证码：${result.devCode}` : ""}`);
    } catch (error) {
      setStatus(readableError(error instanceof Error ? error.message : String(error)));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    setBusy(true);
    setStatus("");
    try {
      if (mode === "login") {
        const result = await api.login({ identifier, password });
        onAuthed(result.user);
      } else if (mode === "register") {
        const result = await api.register({ identifier, password, code, displayName });
        onAuthed(result.user);
      } else {
        await api.resetPassword({ identifier, code, newPassword: password });
        setMode("login");
        setStatus("密码已重置，可以登录了。");
      }
    } catch (error) {
      setStatus(readableError(error instanceof Error ? error.message : String(error)));
    } finally {
      setBusy(false);
    }
  };

  const loginWithWeChat = async () => {
    setBusy(true);
    setStatus("");
    try {
      const result = await api.wechatUrl();
      window.location.href = result.url;
    } catch (error) {
      setStatus(readableError(error instanceof Error ? error.message : String(error)));
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#36332E] flex items-center justify-center px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[980px] grid lg:grid-cols-[1fr_420px] gap-8 items-center"
      >
        <section className="space-y-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-[#FFD166] text-white shadow-sm flex items-center justify-center">
              <Sparkles size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-normal">Hina</h1>
              <p className="text-sm text-[#8A817C] font-semibold">English learning partner for mainland testing</p>
            </div>
          </div>

          <div className="max-w-xl space-y-5">
            <p className="text-[44px] leading-tight font-black tracking-normal text-[#2D2D2D]">
              A chatty little study companion, now with a local passport.
            </p>
            <p className="text-base leading-8 text-[#6F675D]">
              手机号、邮箱和微信入口都在这里。Hina 会继续用朋友的语气聊天，也会在每次回复后给你两条语言提示。
            </p>
          </div>
        </section>

        <section className="bg-white border border-[#E8E2D6] shadow-[0_18px_60px_rgba(55,46,32,0.10)] rounded-[28px] p-6">
          <div className="grid grid-cols-3 gap-2 rounded-2xl bg-[#F7F2E9] p-1 mb-6">
            {[
              ["login", "登录"],
              ["register", "注册"],
              ["reset", "忘记密码"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key as AuthMode);
                  setStatus("");
                }}
                className={cn(
                  "h-10 rounded-xl text-sm font-bold transition",
                  mode === key ? "bg-white text-[#2D2D2D] shadow-sm" : "text-[#8A817C] hover:text-[#2D2D2D]",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {mode === "register" && (
              <label className="block">
                <span className="text-xs font-bold text-[#8A817C]">昵称</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 w-full h-12 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 outline-none focus:ring-2 focus:ring-[#FFD166]"
                  placeholder="Sokie"
                />
              </label>
            )}

            <label className="block">
              <span className="text-xs font-bold text-[#8A817C]">手机号或邮箱</span>
              <div className="mt-2 flex items-center gap-3 h-12 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 focus-within:ring-2 focus-within:ring-[#FFD166]">
                {identifier.includes("@") ? <Mail size={18} className="text-[#B5A48B]" /> : <Phone size={18} className="text-[#B5A48B]" />}
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  className="flex-1 bg-transparent outline-none"
                  placeholder="13812345678 / name@example.com"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-bold text-[#8A817C]">{mode === "reset" ? "新密码" : "密码"}</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full h-12 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 outline-none focus:ring-2 focus:ring-[#FFD166]"
                placeholder="至少 8 位"
              />
            </label>

            {mode !== "login" && (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <label className="block">
                  <span className="text-xs font-bold text-[#8A817C]">验证码</span>
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    className="mt-2 w-full h-12 rounded-2xl border border-[#E8E2D6] bg-[#FDFBF7] px-4 outline-none focus:ring-2 focus:ring-[#FFD166]"
                    placeholder="6 位数字"
                  />
                </label>
                <button
                  onClick={sendCode}
                  disabled={busy || !identifier.trim()}
                  className="self-end h-12 px-5 rounded-full bg-[#5A5A40] text-white font-bold shadow-sm disabled:opacity-40 flex items-center gap-2"
                >
                  <ShieldCheck size={17} />
                  发送
                </button>
              </div>
            )}

            {status && <p className="text-sm text-[#9A6A35] bg-[#FFF7E3] border border-[#F3DDA9] rounded-2xl px-4 py-3">{status}</p>}

            <button
              onClick={submit}
              disabled={busy || !identifier.trim() || !password.trim() || (mode !== "login" && !code.trim())}
              className="w-full h-12 rounded-full bg-[#FF9F1C] text-white font-black shadow-sm disabled:bg-[#E8E2D6] disabled:text-[#AFA493] disabled:shadow-none transition"
            >
              {busy ? "处理中..." : mode === "login" ? "进入 Hina" : mode === "register" ? "创建账号" : "重置密码"}
            </button>

            <button
              onClick={loginWithWeChat}
              disabled={busy}
              className="w-full h-12 rounded-full border border-[#CFE6D9] bg-[#F4FBF7] text-[#28734E] font-black shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <MessageCircle size={18} />
              微信登录
            </button>

            {mode === "reset" && (
              <button onClick={() => setMode("login")} className="w-full text-sm text-[#8A817C] flex items-center justify-center gap-1">
                <RotateCcw size={14} />
                返回登录
              </button>
            )}
          </div>
        </section>
      </motion.div>
    </div>
  );
}
