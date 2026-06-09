interface HealthEnv {
  NODE_ENV?: string;
  DATABASE_URL?: string;
  REDIS_URL?: string;
  ARK_API_KEY?: string;
  ARK_CHAT_MODEL?: string;
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
  const isProduction = env.NODE_ENV === "production";
  const hasDatabase = Boolean(env.DATABASE_URL);
  const hasRedis = Boolean(env.REDIS_URL);
  const hasArk = Boolean(env.ARK_API_KEY && env.ARK_CHAT_MODEL);
  const database = hasDatabase
    ? { mode: "postgres" as const, configured: true, ...(await runCheck(options.checks?.database)) }
    : { mode: "memory" as const, configured: false, ok: !isProduction, error: isProduction ? "DATABASE_URL is required in production." : undefined };
  const redis = hasRedis
    ? { mode: "redis" as const, configured: true, ...(await runCheck(options.checks?.redis)) }
    : { mode: "memory" as const, configured: false, ok: true };
  const model = hasArk
    ? { provider: "ark" as const, configured: true, ok: true }
    : {
      provider: "demo" as const,
      configured: false,
      ok: !isProduction,
      missing: ["ARK_API_KEY", "ARK_CHAT_MODEL"].filter((key) => !env[key as keyof HealthEnv]),
    };

  return {
    ok: database.ok && redis.ok && model.ok,
    env: env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(options.uptimeSeconds?.() ?? process.uptime()),
    database,
    redis,
    model,
  };
}
