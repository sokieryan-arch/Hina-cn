import bcrypt from "bcryptjs";
import { getRuntimeEnvironment } from "../runtimeEnv.js";
import { parseIdentifier, publicMaskedIdentifier } from "./identifiers.js";
import type {
  AuthStores,
  ParsedIdentifier,
  PublicUser,
  SessionRecord,
  UserRecord,
  VerificationPurpose,
} from "./types.js";

interface AuthServiceOptions {
  stores: AuthStores;
  codeGenerator?: () => string;
  now?: () => Date;
  sessionTtlDays?: number;
  notifier?: {
    sendCode(target: ParsedIdentifier, code: string, purpose: VerificationPurpose): Promise<void>;
  };
}

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    phone: user.phone,
    email: user.email,
    hasPassword: Boolean(user.passwordHash),
    hasWeChat: user.hasWeChat === true,
    createdAt: user.createdAt.toISOString(),
  };
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function ensurePassword(password: string) {
  if (password.length < 8) throw new Error("weak_password");
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

function shouldExposeDevCode(identifier: ParsedIdentifier) {
  const runtimeEnv = getRuntimeEnvironment();
  if (!runtimeEnv.isDevelopment) return false;
  if (identifier.kind === "email" && hasSmtpConfig()) return false;
  return true;
}

async function createSession(stores: AuthStores, user: UserRecord, now: Date, ttlDays: number) {
  const session = await stores.sessions.create(user.id, addDays(now, ttlDays));
  return {
    user: toPublicUser(user),
    session: {
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
    },
  };
}

export function createAuthService(options: AuthServiceOptions) {
  const codeGenerator = options.codeGenerator ?? (() => Math.floor(100000 + Math.random() * 900000).toString());
  const now = options.now ?? (() => new Date());
  const sessionTtlDays = options.sessionTtlDays ?? 30;

  async function verifyCode(identifier: ParsedIdentifier, purpose: VerificationPurpose, code: string) {
    const record = await options.stores.verifications.consume(identifier.value, purpose);
    if (!record || record.expiresAt.getTime() < now().getTime() || record.code !== code.trim()) {
      throw new Error("invalid_verification_code");
    }
  }

  return {
    async sendCode(input: { target: string; purpose: VerificationPurpose }) {
      const identifier = parseIdentifier(input.target);
      const code = codeGenerator();
      const expiresAt = addMinutes(now(), 10);

      await options.stores.verifications.save({
        target: identifier.value,
        purpose: input.purpose,
        code,
        expiresAt,
        createdAt: now(),
      });
      await options.notifier?.sendCode(identifier, code, input.purpose);

      return {
        target: identifier.value,
        channel: identifier.kind,
        maskedTarget: publicMaskedIdentifier(identifier),
        expiresAt: expiresAt.toISOString(),
        devCode: shouldExposeDevCode(identifier) ? code : undefined,
      };
    },

    async register(input: { identifier: string; code: string; password: string; displayName?: string }) {
      const identifier = parseIdentifier(input.identifier);
      ensurePassword(input.password);

      const existing = await options.stores.users.findByIdentifier(identifier);
      if (existing) throw new Error("already_registered");

      await verifyCode(identifier, "register", input.code);
      const passwordHash = await bcrypt.hash(input.password, 10);
      const currentTime = now();
      const user = await options.stores.users.create({
        displayName: input.displayName?.trim() || "Sokie",
        email: identifier.kind === "email" ? identifier.value : null,
        phone: identifier.kind === "phone" ? identifier.value : null,
        passwordHash,
        emailVerifiedAt: identifier.kind === "email" ? currentTime : null,
        phoneVerifiedAt: identifier.kind === "phone" ? currentTime : null,
      });

      return createSession(options.stores, user, currentTime, sessionTtlDays);
    },

    async login(input: { identifier: string; password: string }) {
      const identifier = parseIdentifier(input.identifier);
      const user = await options.stores.users.findByIdentifier(identifier);
      if (!user?.passwordHash) throw new Error("invalid_credentials");
      const ok = await bcrypt.compare(input.password, user.passwordHash);
      if (!ok) throw new Error("invalid_credentials");
      return createSession(options.stores, user, now(), sessionTtlDays);
    },

    async resetPassword(input: { identifier: string; code: string; newPassword: string }) {
      const identifier = parseIdentifier(input.identifier);
      ensurePassword(input.newPassword);
      const user = await options.stores.users.findByIdentifier(identifier);
      if (!user) throw new Error("user_not_found");
      await verifyCode(identifier, "reset_password", input.code);
      await options.stores.users.updatePassword(user.id, await bcrypt.hash(input.newPassword, 10));
      return { ok: true };
    },

    async getCurrentUser(token: string | undefined | null) {
      if (!token) return null;
      const session = await options.stores.sessions.find(token);
      if (!session || session.expiresAt.getTime() < now().getTime()) return null;
      const user = await options.stores.users.findById(session.userId);
      return user ? toPublicUser(user) : null;
    },

    async logout(token: string | undefined | null) {
      if (token) await options.stores.sessions.delete(token);
      return { ok: true };
    },

    async createSessionForUser(user: UserRecord) {
      return createSession(options.stores, user, now(), sessionTtlDays);
    },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
export type { SessionRecord };
