import type { Express, Request, Response } from "express";
import { nanoid } from "nanoid";
import { normalizeLanguageTips } from "../shared/languageTips.js";
import { canUseChat } from "./billing.js";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "./cookies.js";
import { buildHealthStatus } from "./health.js";
import { buildProactivePrompt, normalizeProactiveSettings, shouldCreateProactiveNudge } from "./proactive.js";
import { sanitizeChatMessages } from "./requestGuards.js";
import type { AuthService } from "./auth/authService.js";
import type { createWeChatOAuth } from "./auth/wechat.js";
import type { LanguagePartnerProvider, SpeechProvider } from "./providers/types.js";
import type { AppStore, MessageRecord } from "./store/types.js";
import type { createRateLimiter } from "./rateLimit.js";

interface ApiDependencies {
  app: Express;
  store: AppStore;
  auth: AuthService;
  wechat: ReturnType<typeof createWeChatOAuth>;
  provider: LanguagePartnerProvider;
  speech: SpeechProvider;
  chatLimiter: ReturnType<typeof createRateLimiter>;
  ttsLimiter: ReturnType<typeof createRateLimiter>;
  healthChecks?: {
    database?: () => Promise<{ ok: boolean; error?: string }>;
    redis?: () => Promise<{ ok: boolean; error?: string }>;
  };
}

function toClientMessage(message: MessageRecord) {
  return {
    id: message.id,
    role: message.role,
    text: message.text,
    type: message.type,
    tipKind: message.tipKind,
    timestamp: message.createdAt.getTime(),
  };
}

async function currentUser(req: Request, deps: ApiDependencies) {
  return deps.auth.getCurrentUser(getSessionToken(req));
}

async function requireUser(req: Request, deps: ApiDependencies) {
  const user = await currentUser(req, deps);
  if (!user) {
    throw Object.assign(new Error("auth_required"), { statusCode: 401 });
  }
  return user;
}

function sendError(res: Response, error: unknown) {
  const err = error instanceof Error ? error : new Error(String(error));
  const status = typeof (err as any).statusCode === "number" ? (err as any).statusCode : 500;
  res.status(status).json({ error: err.message || "request_failed" });
}

export function registerApiRoutes(deps: ApiDependencies) {
  const { app, store, auth } = deps;

  app.get("/api/health", async (_req, res) => {
    try {
      const health = await buildHealthStatus({ checks: deps.healthChecks });
      res.status(health.ok ? 200 : 503).json(health);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const result = await auth.sendCode({
        target: String(req.body?.target ?? ""),
        purpose: req.body?.purpose === "reset_password" ? "reset_password" : "register",
      });
      res.json(result);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = await auth.register({
        identifier: String(req.body?.identifier ?? ""),
        code: String(req.body?.code ?? ""),
        password: String(req.body?.password ?? ""),
        displayName: typeof req.body?.displayName === "string" ? req.body.displayName : undefined,
      });
      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.json({ user: result.user });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = await auth.login({
        identifier: String(req.body?.identifier ?? ""),
        password: String(req.body?.password ?? ""),
      });
      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.json({ user: result.user });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      await auth.logout(getSessionToken(req));
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/password/reset", async (req, res) => {
    try {
      res.json(await auth.resetPassword({
        identifier: String(req.body?.identifier ?? ""),
        code: String(req.body?.code ?? ""),
        newPassword: String(req.body?.newPassword ?? ""),
      }));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      res.json({ user: await currentUser(req, deps) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/billing/me", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      res.json({ billing: await store.billing.getBillingSummary(user.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/billing/checkout", async (req, res) => {
    try {
      await requireUser(req, deps);
      res.status(503).json({ error: "billing_not_ready" });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/wechat/url", (_req, res) => {
    try {
      const state = nanoid(24);
      res.json({ url: deps.wechat.createLoginUrl(state), state });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/auth/wechat/callback", async (req, res) => {
    try {
      const identity = await deps.wechat.exchangeCode({
        code: String(req.query.code ?? ""),
        state: String(req.query.state ?? ""),
      });

      let user = await store.auth.users.findByExternalIdentity("wechat", identity.openid);
      if (!user) {
        user = await store.auth.users.create({
          displayName: "WeChat Friend",
          passwordHash: null,
        });
        await store.auth.users.linkExternalIdentity({
          userId: user.id,
          provider: "wechat",
          providerUserId: identity.openid,
          unionId: identity.unionid,
          rawProfile: identity,
        });
      }

      const session = await auth.createSessionForUser(user);
      setSessionCookie(res, session.session.token, session.session.expiresAt);
      res.redirect("/?wechat=success");
    } catch (error) {
      res.redirect(`/?wechat=failed&reason=${encodeURIComponent(error instanceof Error ? error.message : "wechat_failed")}`);
    }
  });

  app.get("/api/messages", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const messages = await store.messages.listMessages(user.id);
      res.json({ messages: messages.map(toClientMessage) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put("/api/profile", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const updated = await store.auth.users.updateProfile(user.id, {
        displayName: typeof req.body?.displayName === "string" ? req.body.displayName : undefined,
        avatarUrl: typeof req.body?.avatarUrl === "string" ? req.body.avatarUrl : null,
      });
      const refreshed = await auth.createSessionForUser(updated);
      setSessionCookie(res, refreshed.session.token, refreshed.session.expiresAt);
      res.json({ user: refreshed.user });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/messages", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      await store.messages.clearMessages(user.id);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/chat", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const limit = deps.chatLimiter.consume(user.id);
      if (!limit.allowed) return res.status(429).json({ error: "rate_limited", retryAfterMs: limit.retryAfterMs });

      const billing = await store.billing.getBillingSummary(user.id);
      if (!canUseChat(billing)) {
        return res.status(402).json({ error: "quota_exceeded", billing });
      }

      const messages = sanitizeChatMessages(req.body?.messages);
      const lastUser = [...messages].reverse().find((message) => message.role === "user");
      if (lastUser) {
        await store.messages.addMessage({ userId: user.id, role: "user", text: lastUser.text, type: "response" });
      }

      const data = await deps.provider.chat(messages);
      const responseMessage = await store.messages.addMessage({
        userId: user.id,
        role: "model",
        text: data.response,
        type: "response",
      });

      const tips = normalizeLanguageTips(data.tips);
      const tipMessages = [];
      for (const tip of tips) {
        const text = [
          `${tip.title}\n${tip.body}`,
          tip.original && tip.suggestion ? `Try: "${tip.suggestion}"` : "",
          tip.example ? `Example: ${tip.example}` : "",
        ].filter(Boolean).join("\n");
        tipMessages.push(await store.messages.addMessage({
          userId: user.id,
          role: "model",
          text,
          type: "tip",
          tipKind: tip.type,
        }));
      }
      const nextBilling = await store.billing.incrementChatUsage(user.id);

      res.json({
        response: data.response,
        tips,
        billing: nextBilling,
        messages: [responseMessage, ...tipMessages].map(toClientMessage),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/tts", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const limit = deps.ttsLimiter.consume(user.id);
      if (!limit.allowed) return res.status(429).json({ error: "rate_limited", retryAfterMs: limit.retryAfterMs });
      const text = String(req.body?.text ?? "").trim().slice(0, 700);
      if (!text) return res.status(400).json({ error: "missing_text" });
      const speech = await deps.speech.speak(text);
      if (!speech) return res.status(204).end();
      res.json(speech);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/settings/proactive", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      res.json({ settings: await store.proactive.getProactiveSettings(user.id) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put("/api/settings/proactive", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const settings = await store.proactive.saveProactiveSettings(user.id, normalizeProactiveSettings(req.body));
      res.json({ settings });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/proactive/check", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const settings = await store.proactive.getProactiveSettings(user.id);
      const due = shouldCreateProactiveNudge(settings, {
        now: new Date(),
        lastInteractionAt: settings.lastNudgeAt,
      });

      if (!due) return res.json({ due: false });

      const recentMessages = (await store.messages.listMessages(user.id)).slice(-5).map((message) => message.text);
      const localDate = typeof req.body?.localDate === "string"
        ? req.body.localDate
        : new Date().toISOString().slice(0, 10);
      const promptInput = {
        localDate,
        favoriteTopics: settings.favoriteTopics,
        recentMessages,
      };
      const data = await deps.provider.draftProactiveOpener(promptInput);
      const message = await store.messages.addMessage({
        userId: user.id,
        role: "model",
        text: data.response || buildProactivePrompt(promptInput),
        type: "proactive",
      });
      await store.proactive.markProactiveNudge(user.id, new Date());
      res.json({ due: true, message: toClientMessage(message) });
    } catch (error) {
      sendError(res, error);
    }
  });
}
