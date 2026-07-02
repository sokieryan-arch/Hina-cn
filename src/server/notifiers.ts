import nodemailer from "nodemailer";
import type { ParsedIdentifier, VerificationPurpose } from "./auth/types.js";
import { getRuntimeEnvironment } from "./runtimeEnv.js";

export interface VerificationNotifier {
  sendCode(target: ParsedIdentifier, code: string, purpose: VerificationPurpose): Promise<void>;
}

interface NotifierEnv {
  APP_ENV?: string;
  NODE_ENV?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_FROM?: string;
  VOLCENGINE_SMS_ACCESS_KEY_ID?: string;
  VOLCENGINE_SMS_SECRET_ACCESS_KEY?: string;
}

interface MailMessage {
  from: string;
  to: string;
  subject: string;
  text: string;
}

interface MailTransport {
  sendMail(message: MailMessage): Promise<unknown>;
}

interface SmtpNotifierOptions {
  env?: NotifierEnv;
  createTransport?: (config: {
    host: string;
    port: number;
    secure: boolean;
    auth: { user: string; pass: string };
  }) => MailTransport;
}

interface CompositeNotifierOptions {
  env?: NotifierEnv;
  smtpNotifier?: VerificationNotifier | null;
  smsNotifier?: VerificationNotifier | null;
  fallbackNotifier?: VerificationNotifier;
}

function hasSmtpConfig(env: NotifierEnv = process.env) {
  return Boolean(env.SMTP_HOST?.trim() && env.SMTP_USER?.trim() && env.SMTP_PASS?.trim());
}

function serviceUnavailable(message: string) {
  return Object.assign(new Error(message), { statusCode: 503 });
}

export function getEmailHealth(env: NotifierEnv = process.env) {
  const configured = hasSmtpConfig(env);
  const runtimeEnv = getRuntimeEnvironment(env);
  return configured
    ? { configured: true, ok: true }
    : {
      configured: false,
      ok: !runtimeEnv.isDeployed,
      error: runtimeEnv.isDeployed ? "SMTP_HOST, SMTP_USER, and SMTP_PASS are required for deployed email verification." : undefined,
    };
}

export function createConsoleNotifier(): VerificationNotifier {
  return {
    async sendCode(target, code, purpose) {
      console.log(`[Hina verification] ${purpose} ${target.value}: ${code}`);
    },
  };
}

export function createSmtpNotifier(options: SmtpNotifierOptions = {}): VerificationNotifier | null {
  const env = options.env ?? process.env;
  if (!hasSmtpConfig(env)) return null;

  const port = Number(env.SMTP_PORT || 465);
  const transporter = (options.createTransport ?? nodemailer.createTransport)({
    host: env.SMTP_HOST!,
    port,
    secure: port === 465,
    auth: {
      user: env.SMTP_USER!,
      pass: env.SMTP_PASS!,
    },
  }) as MailTransport;

  return {
    async sendCode(target, code, purpose) {
      if (target.kind !== "email") return;
      await transporter.sendMail({
        from: env.SMTP_FROM || "Hina <no-reply@example.com>",
        to: target.value,
        subject: purpose === "register" ? "Hina verification code" : "Reset your Hina password",
        text: `Your Hina code is ${code}. It expires in 10 minutes.`,
      });
    },
  };
}

export function createVolcengineSmsNotifier(): VerificationNotifier | null {
  // Real Volcengine SMS delivery is intentionally not wired yet. Do not pretend
  // production SMS was sent by logging a code.
  return null;
}

export function createCompositeNotifier(options: CompositeNotifierOptions = {}): VerificationNotifier {
  const env = options.env ?? process.env;
  const runtimeEnv = getRuntimeEnvironment(env);
  const smtp = options.smtpNotifier !== undefined ? options.smtpNotifier : createSmtpNotifier({ env });
  const sms = options.smsNotifier !== undefined ? options.smsNotifier : createVolcengineSmsNotifier();
  const fallback = options.fallbackNotifier ?? createConsoleNotifier();

  return {
    async sendCode(target, code, purpose) {
      if (target.kind === "email") {
        if (smtp) return smtp.sendCode(target, code, purpose);
        if (runtimeEnv.isDeployed) throw serviceUnavailable("email_not_configured");
        return fallback.sendCode(target, code, purpose);
      }

      if (target.kind === "phone") {
        if (sms) return sms.sendCode(target, code, purpose);
        if (runtimeEnv.isDeployed) throw serviceUnavailable("phone_verification_unavailable");
        return fallback.sendCode(target, code, purpose);
      }

      return fallback.sendCode(target, code, purpose);
    },
  };
}
