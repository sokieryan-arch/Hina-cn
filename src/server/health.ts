import { getEmailHealth } from "./notifiers.js";
import { getRuntimeEnvironment } from "./runtimeEnv.js";

interface HealthEnv {
  APP_ENV?: string;
  NODE_ENV?: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  ARK_API_KEY?: string;
  ARK_CHAT_MODEL?: string;
  SMTP_HOST?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  WECHAT_MINI_APP_ID?: string;
  WECHAT_MINI_APP_SECRET?: string;
  WECHAT_CONTENT_SECURITY_ENABLED?: string;
}

interface CheckResult {
  ok: boolean;
  error?: string;
}

interface HealthOptions {
  env?: HealthEnv;
  uptimeSeconds?: () => number;
  checks?: {
    database?: () => Promise<CheckResult>;
    redis?: () => Promise<CheckResult>;
  };
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message
    .replace(/postgres:\/\/[^@\s]+@/gi, "postgres://[redacted]@")
    .replace(/redis:\/\/[^@\s]+@/gi, "redis://[redacted]@")
    .replace(/password=[^\s;]+/gi, "password=[redacted]")
    .slice(0, 180);
}

async function runCheck(check?: () => Promise<CheckResult>): Promise<CheckResult> {
  if (!check) return { ok: true };
  try {
    const result = await check();
    return result.ok
      ? { ok: true }
      : { ok: false, error: result.error ? sanitizeError(result.error) : "check_failed" };
  } catch (error) {
    return { ok: false, error: sanitizeError(error) };
  }
}

export async function buildHealthStatus(options: HealthOptions = {}) {
  const env = options.env ?? process.env;
  const runtimeEnv = getRuntimeEnvironment(env);
  const hasDatabase = Boolean(env.DATABASE_URL);
  const hasRedis = Boolean(env.REDIS_URL);
  const hasArk = Boolean(env.ARK_API_KEY && env.ARK_CHAT_MODEL);
  const database = hasDatabase
    ? { mode: "postgres" as const, configured: true, ...(await runCheck(options.checks?.database)) }
    : {
      mode: "memory" as const,
      configured: false,
      ok: !runtimeEnv.isDeployed,
      error: runtimeEnv.isDeployed ? "DATABASE_URL is required in deployed environments." : undefined,
    };
  const redis = hasRedis
    ? { mode: "redis" as const, configured: true, ...(await runCheck(options.checks?.redis)) }
    : { mode: "memory" as const, configured: false, ok: true };
  const model = hasArk
    ? { provider: "ark" as const, configured: true, ok: true }
    : {
      provider: "demo" as const,
      configured: false,
      ok: !runtimeEnv.isDeployed,
      missing: ["ARK_API_KEY", "ARK_CHAT_MODEL"].filter((key) => !env[key as keyof HealthEnv]),
    };
  const email = getEmailHealth(env);
  const wechatMini = {
    configured: Boolean(env.WECHAT_MINI_APP_ID && env.WECHAT_MINI_APP_SECRET),
    contentSafetyEnabled: env.WECHAT_CONTENT_SECURITY_ENABLED === "true",
    ok: env.WECHAT_CONTENT_SECURITY_ENABLED !== "true"
      || Boolean(env.WECHAT_MINI_APP_ID && env.WECHAT_MINI_APP_SECRET),
  };

  return {
    ok: database.ok && redis.ok && model.ok && email.ok && wechatMini.ok,
    env: runtimeEnv.appEnv,
    nodeEnv: runtimeEnv.nodeEnv,
    uptimeSeconds: Math.floor(options.uptimeSeconds?.() ?? process.uptime()),
    database,
    redis,
    model,
    email,
    wechatMini,
  };
}
