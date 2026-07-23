import type { Express, Request, Response } from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { normalizeLanguageTips } from "../shared/languageTips.js";
import { STUDY_CATEGORIES, WISHLIST_KINDS, buildRelationshipSummary, noteDedupeKey, studyCategoryForTip, toClientCapsule, toClientNote, toClientWishlist } from "./space.js";
import { saveAvatarUpload } from "./avatarUpload.js";
import { canUseChat } from "./billing.js";
import { clearSessionCookie, getSessionToken, setSessionCookie } from "./cookies.js";
import { buildHealthStatus } from "./health.js";
import { buildProactivePrompt, normalizeProactiveSettings, shouldCreateProactiveNudge } from "./proactive.js";
import { sanitizeChatMessages } from "./requestGuards.js";
import type { AuthService } from "./auth/authService.js";
import type { createWeChatOAuth } from "./auth/wechat.js";
import type { WeChatMiniAuth } from "./auth/wechatMini.js";
import type { LanguagePartnerProvider, SpeechProvider } from "./providers/types.js";
import type { AppStore, MessageRecord } from "./store/types.js";
import type { createRateLimiter } from "./rateLimit.js";
import type { MomentService } from "./moments.js";
import type { StudyCategory } from "../shared/languageTips.js";
import type { WishlistKind } from "../shared/types.js";
import { parseIdentifier } from "./auth/identifiers.js";
import { hasImmediateSafetyRisk, SAFETY_SUPPORT_MESSAGE } from "./safety.js";
import type { WeChatContentSafety } from "./wechatContentSafety.js";

const PRIVACY_VERSION = "2026-07-24";

interface ApiDependencies {
  app: Express;
  store: AppStore;
  auth: AuthService;
  wechat: ReturnType<typeof createWeChatOAuth>;
  wechatMini?: WeChatMiniAuth;
  wechatContentSafety?: WeChatContentSafety;
  provider: LanguagePartnerProvider;
  speech: SpeechProvider;
  moments?: MomentService;
  chatLimiter: ReturnType<typeof createRateLimiter>;
  ttsLimiter: ReturnType<typeof createRateLimiter>;
  uploadsRoot?: string;
  healthChecks?: {
    database?: () => Promise<{ ok: boolean; error?: string }>;
    redis?: () => Promise<{ ok: boolean; error?: string }>;
  };
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const text = typeof value === "string" ? value.trim().slice(0, maxLength) : "";
  if (!text) throw Object.assign(new Error(`missing_${field}`), { statusCode: 400 });
  return text;
}

function optionalText(value: unknown, maxLength: number): string | null {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : null;
}

function progressValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback;
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

function isAdultBirthDate(value: string, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const birthDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > now) return false;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const birthdayPassed = now.getUTCMonth() > birthDate.getUTCMonth()
    || now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() >= birthDate.getUTCDate();
  if (!birthdayPassed) age -= 1;
  return age >= 18;
}

function toClientSafetyProfile(profile: Awaited<ReturnType<AppStore["account"]["getSafetyProfile"]>>) {
  return profile
    ? {
      birthDate: profile.birthDate,
      adultConfirmed: profile.adultConfirmed,
      privacyVersion: profile.privacyVersion,
      consentedAt: profile.consentedAt.toISOString(),
    }
    : null;
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

  app.get("/api/account/safety-profile", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const profile = await store.account.getSafetyProfile(user.id);
      res.json({
        profile: toClientSafetyProfile(profile),
        privacyVersion: PRIVACY_VERSION,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.put("/api/account/safety-profile", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const birthDate = String(req.body?.birthDate ?? "");
      if (req.body?.adultConfirmed !== true || !isAdultBirthDate(birthDate)) {
        return res.status(403).json({ error: "adult_access_required" });
      }
      if (req.body?.privacyAccepted !== true) {
        return res.status(400).json({ error: "privacy_consent_required" });
      }
      const profile = await store.account.saveSafetyProfile({
        userId: user.id,
        birthDate,
        adultConfirmed: true,
        privacyVersion: PRIVACY_VERSION,
      });
      res.json({ profile: toClientSafetyProfile(profile) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/account/export", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      res.setHeader("Content-Disposition", `attachment; filename="hina-data-${user.id}.json"`);
      res.json(await store.account.exportUserData(user.id));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/account", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      if (req.body?.confirmation !== "DELETE") {
        return res.status(400).json({ error: "account_deletion_confirmation_required" });
      }
      await store.account.deleteUser(user.id);
      const uploadsRoot = path.resolve(deps.uploadsRoot ?? path.join(process.cwd(), "uploads"));
      const userUploads = path.resolve(uploadsRoot, user.id);
      if (userUploads.startsWith(`${uploadsRoot}${path.sep}`)) {
        await fs.rm(userUploads, { recursive: true, force: true }).catch(() => undefined);
      }
      clearSessionCookie(res);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const requestedCategory = String(req.body?.category ?? "other");
      const category = ["bug", "safety", "privacy", "other"].includes(requestedCategory)
        ? requestedCategory as "bug" | "safety" | "privacy" | "other"
        : "other";
      const report = await store.account.createFeedback({
        userId: user.id,
        category,
        message: requiredText(req.body?.message, "feedback", 2000),
        contact: optionalText(req.body?.contact, 200),
      });
      res.status(201).json({ id: report.id, createdAt: report.createdAt.toISOString() });
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
      const patch: { displayName?: string; avatarUrl?: string | null } = {
        displayName: typeof req.body?.displayName === "string" ? req.body.displayName : undefined,
      };
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "avatarUrl")) {
        patch.avatarUrl = typeof req.body?.avatarUrl === "string" && req.body.avatarUrl.trim()
          ? req.body.avatarUrl.trim()
          : null;
      }
      const updated = await store.auth.users.updateProfile(user.id, patch);
      const refreshed = await auth.createSessionForUser(updated);
      setSessionCookie(res, refreshed.session.token, refreshed.session.expiresAt);
      res.json({ user: refreshed.user });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/profile/avatar", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const avatarUrl = await saveAvatarUpload(req, {
        userId: user.id,
        uploadsRoot: deps.uploadsRoot ?? path.join(process.cwd(), "uploads"),
      });
      const updated = await store.auth.users.updateProfile(user.id, { avatarUrl });
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

  app.get("/api/space/moments", async (req, res) => {
    try {
      await requireUser(req, deps);
      await deps.moments?.ensureMoment();
      const moments = await store.space.listMoments();
      res.json({
        moments: moments.map((moment) => ({
          id: moment.id,
          body: moment.body,
          occasion: moment.occasion ?? null,
          publishedAt: moment.publishedAt.toISOString(),
        })),
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/wechat-mini/login", async (req, res) => {
    try {
      if (!deps.wechatMini) throw new Error("wechat_mini_not_available");
      const identity = await deps.wechatMini.exchangeCode(String(req.body?.code ?? ""));
      let user = await store.auth.users.findByExternalIdentity("wechat_mini", identity.openid);
      if (!user) {
        user = await store.auth.users.create({
          displayName: "WeChat Friend",
          passwordHash: null,
        });
        await store.auth.users.linkExternalIdentity({
          userId: user.id,
          provider: "wechat_mini",
          providerUserId: identity.openid,
          unionId: identity.unionid,
          rawProfile: {
            openid: identity.openid,
            unionid: identity.unionid ?? null,
          },
        });
        user = await store.auth.users.findById(user.id) ?? user;
      }

      const result = await auth.createSessionForUser(user);
      const safetyProfile = await store.account.getSafetyProfile(user.id);
      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.json({
        user: result.user,
        session: result.session,
        needsOnboarding: !safetyProfile?.adultConfirmed
          || safetyProfile.privacyVersion !== PRIVACY_VERSION,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/link/email/send-code", async (req, res) => {
    try {
      const sourceUser = await requireUser(req, deps);
      const sourceIdentity = await store.auth.users.findExternalIdentityByUser(sourceUser.id, "wechat_mini");
      if (!sourceIdentity) return res.status(403).json({ error: "wechat_mini_login_required" });
      const identifier = parseIdentifier(String(req.body?.email ?? ""));
      if (identifier.kind !== "email") return res.status(400).json({ error: "email_required" });
      const targetUser = await store.auth.users.findByIdentifier(identifier);
      if (!targetUser) return res.status(404).json({ error: "account_not_found" });
      if (targetUser.id === sourceUser.id) return res.status(409).json({ error: "account_already_linked" });
      res.json(await auth.sendCode({ target: identifier.value, purpose: "link_email" }));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/auth/link/email/confirm", async (req, res) => {
    try {
      const sourceUser = await requireUser(req, deps);
      const sourceIdentity = await store.auth.users.findExternalIdentityByUser(sourceUser.id, "wechat_mini");
      if (!sourceIdentity) return res.status(403).json({ error: "wechat_mini_login_required" });

      const identifier = await auth.verifyIdentifierCode({
        identifier: String(req.body?.email ?? ""),
        code: String(req.body?.code ?? ""),
        purpose: "link_email",
      });
      if (identifier.kind !== "email") return res.status(400).json({ error: "email_required" });
      const targetUser = await store.auth.users.findByIdentifier(identifier);
      if (!targetUser) return res.status(404).json({ error: "account_not_found" });
      if (targetUser.id === sourceUser.id) return res.status(409).json({ error: "account_already_linked" });

      const targetIdentity = await store.auth.users.findExternalIdentityByUser(targetUser.id, "wechat_mini");
      if (targetIdentity && targetIdentity.providerUserId !== sourceIdentity.providerUserId) {
        return res.status(409).json({ error: "wechat_already_linked" });
      }

      await store.account.mergeUsers(sourceUser.id, targetUser.id);
      const mergedUser = await store.auth.users.findById(targetUser.id);
      if (!mergedUser) throw new Error("account_merge_failed");
      const result = await auth.createSessionForUser(mergedUser);
      setSessionCookie(res, result.session.token, result.session.expiresAt);
      res.json({
        user: result.user,
        session: result.session,
        needsOnboarding: !(await store.account.getSafetyProfile(mergedUser.id))?.adultConfirmed,
      });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/space/notes", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const requested = typeof req.query.category === "string" ? req.query.category : undefined;
      const category = requested && STUDY_CATEGORIES.has(requested as StudyCategory)
        ? requested as StudyCategory
        : undefined;
      const notes = await store.space.listNotes(user.id, category);
      res.json({ notes: notes.map(toClientNote) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/space/notes", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      await store.space.clearNotes(user.id);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete("/api/space/notes/:id", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const deleted = await store.space.deleteNote(user.id, req.params.id);
      res.status(deleted ? 200 : 404).json(deleted ? { ok: true } : { error: "note_not_found" });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/space/wishlist", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      res.json({ items: (await store.space.listWishlist(user.id)).map(toClientWishlist) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/space/wishlist", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const kind = String(req.body?.kind ?? "goal").toLowerCase() as WishlistKind;
      if (!WISHLIST_KINDS.has(kind)) return res.status(400).json({ error: "invalid_wishlist_kind" });
      const completed = req.body?.completed === true;
      const item = await store.space.createWishlist({
        userId: user.id,
        kind,
        title: requiredText(req.body?.title, "title", 120),
        details: optionalText(req.body?.details, 500),
        targetDate: optionalText(req.body?.targetDate, 10),
        progress: completed ? 100 : progressValue(req.body?.progress),
        completed,
      });
      res.status(201).json({ item: toClientWishlist(item) });
    } catch (error) {
      sendError(res, error);
    }
  });

  const updateWishlist = async (req: Request, res: Response) => {
    try {
      const user = await requireUser(req, deps);
      const patch: Record<string, unknown> = {};
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "kind")) {
        const kind = String(req.body.kind).toLowerCase() as WishlistKind;
        if (!WISHLIST_KINDS.has(kind)) return res.status(400).json({ error: "invalid_wishlist_kind" });
        patch.kind = kind;
      }
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "title")) patch.title = requiredText(req.body.title, "title", 120);
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "details")) patch.details = optionalText(req.body.details, 500);
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "targetDate")) patch.targetDate = optionalText(req.body.targetDate, 10);
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "progress")) patch.progress = progressValue(req.body.progress);
      if (Object.prototype.hasOwnProperty.call(req.body ?? {}, "completed")) {
        patch.completed = req.body.completed === true;
        if (patch.completed) patch.progress = 100;
      }
      const item = await store.space.updateWishlist(user.id, req.params.id, patch);
      if (!item) return res.status(404).json({ error: "wishlist_item_not_found" });
      res.json({ item: toClientWishlist(item) });
    } catch (error) {
      sendError(res, error);
    }
  };
  app.patch("/api/space/wishlist/:id", updateWishlist);
  app.put("/api/space/wishlist/:id", updateWishlist);

  app.delete("/api/space/wishlist/:id", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const deleted = await store.space.deleteWishlist(user.id, req.params.id);
      res.status(deleted ? 200 : 404).json(deleted ? { ok: true } : { error: "wishlist_item_not_found" });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/space/capsules", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const now = new Date();
      res.json({ capsules: (await store.space.listCapsules(user.id)).map((capsule) => toClientCapsule(capsule, now)) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/space/capsules", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const unlockAt = new Date(String(req.body?.unlockAt ?? ""));
      if (Number.isNaN(unlockAt.getTime()) || unlockAt.getTime() <= Date.now()) {
        return res.status(400).json({ error: "invalid_unlock_date" });
      }
      const capsule = await store.space.createCapsule({
        userId: user.id,
        title: requiredText(req.body?.title, "title", 120),
        body: requiredText(req.body?.body, "capsule_body", 2000),
        unlockAt,
      });
      res.status(201).json({ capsule: toClientCapsule(capsule, new Date()) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post("/api/space/capsules/:id/open", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const now = new Date();
      const capsule = await store.space.openCapsule(user.id, req.params.id, now);
      if (!capsule) return res.status(403).json({ error: "capsule_locked_or_missing" });
      res.json({ capsule: toClientCapsule(capsule, now) });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/space/relationship", async (req, res) => {
    try {
      const user = await requireUser(req, deps);
      const summary = buildRelationshipSummary({
        createdAt: new Date(user.createdAt),
        counts: await store.space.getRelationshipCounts(user.id),
      });
      res.json({ relationship: summary });
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
      if (lastUser && hasImmediateSafetyRisk(lastUser.text)) {
        return res.status(409).json({
          error: "safety_support_needed",
          message: SAFETY_SUPPORT_MESSAGE,
        });
      }

      const miniIdentity = deps.wechatContentSafety?.isEnabled()
        ? await store.auth.users.findExternalIdentityByUser(user.id, "wechat_mini")
        : null;
      if (lastUser && miniIdentity && deps.wechatContentSafety) {
        const check = await deps.wechatContentSafety.checkText({
          openid: miniIdentity.providerUserId,
          content: lastUser.text,
        });
        if (!check.allowed) {
          return res.status(422).json({ error: "content_not_allowed" });
        }
      }

      if (lastUser) {
        await store.messages.addMessage({ userId: user.id, role: "user", text: lastUser.text, type: "response" });
      }

      const data = await deps.provider.chat(messages);
      const tips = normalizeLanguageTips(data.tips);
      if (miniIdentity && deps.wechatContentSafety) {
        const check = await deps.wechatContentSafety.checkText({
          openid: miniIdentity.providerUserId,
          content: [data.response, ...tips.map((tip) => `${tip.title} ${tip.body}`)].join("\n"),
        });
        if (!check.allowed) {
          return res.status(502).json({ error: "generated_content_not_allowed" });
        }
      }

      const responseMessage = await store.messages.addMessage({
        userId: user.id,
        role: "model",
        text: data.response,
        type: "response",
      });

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
        const tipMessage = tipMessages[tipMessages.length - 1];
        await store.space.saveNote({
          userId: user.id,
          category: studyCategoryForTip(tip),
          title: tip.title,
          body: tip.body,
          example: tip.example ?? null,
          original: tip.original ?? null,
          suggestion: tip.suggestion ?? null,
          sourceMessageId: tipMessage.id,
          dedupeKey: noteDedupeKey(tip),
        });
      }
      const nextBilling = await store.billing.incrementChatUsage(user.id);

      res.json({
        response: data.response,
        tips,
        billing: nextBilling,
        messages: [responseMessage, ...tipMessages].map(toClientMessage),
        wishlistSuggestion: data.wishlistSuggestion,
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
