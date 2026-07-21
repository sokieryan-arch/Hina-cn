import { dateKey, newYorkHolidayContext, nextMomentDue } from "./space.js";
import type { LanguagePartnerProvider } from "./providers/types.js";
import type { AppStore, HinaMomentRecord } from "./store/types.js";

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;

const FALLBACK_MOMENTS = [
  "I found a tiny coffee shop near campus where the barista draws constellations on every cup. Mine looked suspiciously like a sleepy potato, so naturally I called it modern art and kept the sleeve.",
  "Brooklyn was all soft wind and library-book weather today. I read three pages of philosophy, sketched two strangers' shoes, and somehow came home with a bag of lychee gummies. Very serious academic research.",
  "I took the long way home after class and watched the city lights switch on one window at a time. It felt like New York was quietly opening a hundred little storybooks at once.",
];

function fallbackMoment(now: Date, occasion: string | null) {
  if (occasion) {
    return `Today carried a little ${occasion} sparkle through New York. I made tea, called home, and tucked one small wish into my philosophy book for later.`;
  }
  const index = now.getUTCDate() % FALLBACK_MOMENTS.length;
  return FALLBACK_MOMENTS[index];
}

export function createMomentService(input: {
  store: AppStore;
  provider: LanguagePartnerProvider;
  now?: () => Date;
}) {
  const now = input.now ?? (() => new Date());
  let running: Promise<HinaMomentRecord | null> | null = null;

  async function ensureMoment(): Promise<HinaMomentRecord | null> {
    if (running) return running;
    running = (async () => {
      const current = now();
      const latest = await input.store.space.latestMoment();
      if (latest && latest.nextDueAt.getTime() > current.getTime()) return latest;
      const occasion = newYorkHolidayContext(current);
      let body = fallbackMoment(current, occasion);
      try {
        const draft = await input.provider.draftMoment({
          localDate: dateKey(current, "America/New_York"),
          occasion,
        });
        if (draft.body.trim()) body = draft.body.trim().slice(0, 900);
      } catch (error) {
        console.warn("Moment generation used fallback:", error instanceof Error ? error.message : String(error));
      }
      return await input.store.space.addMomentIfDue({
        body,
        occasion,
        now: current,
        nextDueAt: nextMomentDue(current),
      }) ?? await input.store.space.latestMoment();
    })().finally(() => {
      running = null;
    });
    return running;
  }

  function start() {
    void ensureMoment().catch((error) => console.error("Moment check failed:", error));
    const timer = setInterval(() => {
      void ensureMoment().catch((error) => console.error("Moment check failed:", error));
    }, CHECK_INTERVAL_MS);
    timer.unref?.();
    return () => clearInterval(timer);
  }

  return { ensureMoment, start };
}

export type MomentService = ReturnType<typeof createMomentService>;
