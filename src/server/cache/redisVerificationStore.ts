import { createClient } from "redis";
import type { VerificationPurpose, VerificationRecord, VerificationStore } from "../auth/types.js";

export async function createRedisVerificationStore(
  redisUrl: string,
  keyPrefix = "hina",
): Promise<VerificationStore> {
  const client = createClient({ url: redisUrl });
  await client.connect();

  const normalizedPrefix = keyPrefix.trim().replace(/:+$/, "") || "hina";
  const keyFor = (target: string, purpose: VerificationPurpose) =>
    `${normalizedPrefix}:verification:${purpose}:${target}`;

  return {
    async save(record: VerificationRecord) {
      const ttlSeconds = Math.max(1, Math.floor((record.expiresAt.getTime() - Date.now()) / 1000));
      await client.set(keyFor(record.target, record.purpose), JSON.stringify({
        target: record.target,
        purpose: record.purpose,
        code: record.code,
        expiresAt: record.expiresAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
      }), { EX: ttlSeconds });
    },
    async consume(target, purpose) {
      const key = keyFor(target, purpose);
      const raw = await client.get(key);
      await client.del(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Record<string, string>;
      return {
        target: parsed.target,
        purpose: parsed.purpose as VerificationPurpose,
        code: parsed.code,
        expiresAt: new Date(parsed.expiresAt),
        createdAt: new Date(parsed.createdAt),
      };
    },
  };
}
