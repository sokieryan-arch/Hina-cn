import { createAuthService } from "./auth/authService.js";
import { createWeChatOAuth } from "./auth/wechat.js";
import { createRedisVerificationStore } from "./cache/redisVerificationStore.js";
import { validateRuntimeEnv } from "./config.js";
import { getRuntimeEnvironment } from "./runtimeEnv.js";
import { createCompositeNotifier } from "./notifiers.js";
import { createRateLimiter } from "./rateLimit.js";
import { createMomentService } from "./moments.js";
import { DemoLanguagePartnerProvider } from "./providers/demoProvider.js";
import { VolcengineArkProvider } from "./providers/arkProvider.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";
import { createPostgresAppStore } from "./store/postgresAppStore.js";
import type { AppStore } from "./store/types.js";
import type { LanguagePartnerProvider, SpeechProvider } from "./providers/types.js";
import pg from "pg";
import { createClient } from "redis";

const { Pool } = pg;

async function createStore(): Promise<AppStore> {
  const store = process.env.DATABASE_URL
    ? createPostgresAppStore(process.env.DATABASE_URL)
    : createMemoryAppStore();

  if (process.env.REDIS_URL) {
    store.auth.verifications = await createRedisVerificationStore(process.env.REDIS_URL);
  }

  return store;
}

function createProvider(): LanguagePartnerProvider & SpeechProvider {
  if (process.env.ARK_API_KEY && process.env.ARK_CHAT_MODEL) {
    return new VolcengineArkProvider();
  }

  if (getRuntimeEnvironment().isDeployed) {
    return new VolcengineArkProvider();
  }

  console.warn("ARK_API_KEY or ARK_CHAT_MODEL is missing. Using local demo provider.");
  return new DemoLanguagePartnerProvider() as LanguagePartnerProvider & SpeechProvider;
}

export async function createRuntime() {
  validateRuntimeEnv();
  const store = await createStore();
  const auth = createAuthService({
    stores: store.auth,
    notifier: createCompositeNotifier(),
  });
  const provider = createProvider();
  const moments = createMomentService({ store, provider });

  return {
    store,
    auth,
    provider,
    moments,
    speech: provider,
    wechat: createWeChatOAuth({
      stateStore: new Map(),
    }),
    chatLimiter: createRateLimiter({
      limit: Number(process.env.CHAT_RATE_LIMIT_PER_MINUTE || 30),
      windowMs: 60 * 1000,
    }),
    ttsLimiter: createRateLimiter({
      limit: Number(process.env.TTS_RATE_LIMIT_PER_MINUTE || 10),
      windowMs: 60 * 1000,
    }),
    healthChecks: {
      async database() {
        if (!process.env.DATABASE_URL) return { ok: true };
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        try {
          await pool.query("select 1");
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) };
        } finally {
          await pool.end().catch(() => undefined);
        }
      },
      async redis() {
        if (!process.env.REDIS_URL) return { ok: true };
        const client = createClient({ url: process.env.REDIS_URL });
        try {
          await client.connect();
          await client.ping();
          return { ok: true };
        } catch (error) {
          return { ok: false, error: error instanceof Error ? error.message : String(error) };
        } finally {
          await client.quit().catch(() => undefined);
        }
      },
    },
  };
}
