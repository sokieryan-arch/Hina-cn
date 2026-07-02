import { getRuntimeEnvironment } from "./runtimeEnv.js";

export interface RuntimeConfig {
  nodeEnv: string;
  appEnv: string;
  isProduction: boolean;
  isStaging: boolean;
  isDeployed: boolean;
  missingProductionKeys: string[];
  missingDeploymentKeys: string[];
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
  const runtimeEnv = getRuntimeEnvironment(env);
  const missingDeploymentKeys = runtimeEnv.isDeployed
    ? REQUIRED_PRODUCTION_KEYS.filter((key) => {
      if (key === "SESSION_SECRET") return isUnsafeSessionSecret(env[key]);
      return isBlank(env[key]);
    })
    : [];

  if (missingDeploymentKeys.length > 0) {
    throw new Error(`Missing required deployment environment variables: ${missingDeploymentKeys.join(", ")}`);
  }

  return {
    nodeEnv: runtimeEnv.nodeEnv,
    appEnv: runtimeEnv.appEnv,
    isProduction: runtimeEnv.isProduction,
    isStaging: runtimeEnv.isStaging,
    isDeployed: runtimeEnv.isDeployed,
    missingProductionKeys: missingDeploymentKeys,
    missingDeploymentKeys,
  };
}
