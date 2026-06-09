import nodemailer from "nodemailer";
import type { ParsedIdentifier, VerificationPurpose } from "./auth/types.js";

export interface VerificationNotifier {
  sendCode(target: ParsedIdentifier, code: string, purpose: VerificationPurpose): Promise<void>;
}

export function createConsoleNotifier(): VerificationNotifier {
  return {
    async sendCode(target, code, purpose) {
      console.log(`[Hina verification] ${purpose} ${target.value}: ${code}`);
    },
  };
}

export function createSmtpNotifier(): VerificationNotifier | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return {
    async sendCode(target, code, purpose) {
      if (target.kind !== "email") return;
      await transporter.sendMail({
        from: process.env.SMTP_FROM || "Hina <no-reply@example.com>",
        to: target.value,
        subject: purpose === "register" ? "Hina verification code" : "Reset your Hina password",
        text: `Your Hina code is ${code}. It expires in 10 minutes.`,
      });
    },
  };
}

export function createVolcengineSmsNotifier(): VerificationNotifier | null {
  if (!process.env.VOLCENGINE_SMS_ACCESS_KEY_ID || !process.env.VOLCENGINE_SMS_SECRET_ACCESS_KEY) {
    return null;
  }

  return {
    async sendCode(target, code, purpose) {
      if (target.kind !== "phone") return;
      console.log(`[Volcengine SMS placeholder] ${purpose} ${target.value}: ${code}`);
    },
  };
}

export function createCompositeNotifier(): VerificationNotifier {
  const smtp = createSmtpNotifier();
  const sms = createVolcengineSmsNotifier();
  const fallback = createConsoleNotifier();

  return {
    async sendCode(target, code, purpose) {
      if (target.kind === "email" && smtp) return smtp.sendCode(target, code, purpose);
      if (target.kind === "phone" && sms) return sms.sendCode(target, code, purpose);
      return fallback.sendCode(target, code, purpose);
    },
  };
}
