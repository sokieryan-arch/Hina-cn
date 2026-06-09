export interface RuntimeConfig {
  nodeEnv: string;
  isProduction: boolean;
  missingProductionKeys: string[];
}

const REQUIRED_PRODUCTION_KEYS = [
  "SESSION_SECRET",
  "DATABASE_URL",
  "ARK_API_KEY",
  "ARK_CHAT_MODEL",
] as const;

function isBlank(value: unknown) {
  return typeof value !== "string" || value.trim().length === 0;
}

function isUnsafeSessionSecret(value: unknown) {
  if (isBlank(value)) return true;
  return value === "change-me-in-production" || String(value).length < 24;
}

export function validateRuntimeEnv(env: NodeJS.ProcessEnv = process.env): RuntimeConfig {
  const nodeEnv = env.NODE_ENV || "development";
  const isProduction = nodeEnv === "production";
  const missingProductionKeys = isProduction
    ? REQUIRED_PRODUCTION_KEYS.filter((key) => {
      if (key === "SESSION_SECRET") return isUnsafeSessionSecret(env[key]);
      return isBlank(env[key]);
    })
    : [];

  if (missingProductionKeys.length > 0) {
    throw new Error(`Missing required production environment variables: ${missingProductionKeys.join(", ")}`);
  }

  return {
    nodeEnv,
    isProduction,
    missingProductionKeys,
  };
}
