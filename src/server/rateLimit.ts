interface RateLimitOptions {
  limit: number;
  windowMs: number;
  now?: () => number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(options: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();
  const now = options.now ?? (() => Date.now());

  return {
    consume(key: string) {
      const safeKey = key || "anonymous";
      const current = now();
      const existing = buckets.get(safeKey);
      const bucket = !existing || existing.resetAt <= current
        ? { count: 0, resetAt: current + options.windowMs }
        : existing;

      if (bucket.count >= options.limit) {
        buckets.set(safeKey, bucket);
        return { allowed: false, retryAfterMs: Math.max(0, bucket.resetAt - current) };
      }

      bucket.count += 1;
      buckets.set(safeKey, bucket);
      return { allowed: true, retryAfterMs: Math.max(0, bucket.resetAt - current) };
    },
  };
}
