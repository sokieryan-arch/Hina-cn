export type AppEnv = "development" | "staging" | "production";

export interface RuntimeEnvironment {
  appEnv: AppEnv;
  nodeEnv: string;
  isDevelopment: boolean;
  isStaging: boolean;
  isProduction: boolean;
  isDeployed: boolean;
}

interface RuntimeEnvInput {
  APP_ENV?: string;
  NODE_ENV?: string;
}

function normalizeAppEnv(env: RuntimeEnvInput = process.env): AppEnv {
  if (env.APP_ENV === "staging" || env.APP_ENV === "production" || env.APP_ENV === "development") {
    return env.APP_ENV;
  }
  return env.NODE_ENV === "production" ? "production" : "development";
}

export function getRuntimeEnvironment(env: RuntimeEnvInput = process.env): RuntimeEnvironment {
  const appEnv = normalizeAppEnv(env);
  const nodeEnv = env.NODE_ENV || "development";

  return {
    appEnv,
    nodeEnv,
    isDevelopment: appEnv === "development",
    isStaging: appEnv === "staging",
    isProduction: appEnv === "production",
    isDeployed: appEnv === "staging" || appEnv === "production",
  };
}

export function shouldUseSecureCookies(env: RuntimeEnvInput = process.env) {
  return (env.NODE_ENV || "development") === "production";
}
