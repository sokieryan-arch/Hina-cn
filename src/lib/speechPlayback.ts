interface SpeechQueueOptions<T> {
  chunks: string[];
  synthesize: (chunk: string) => Promise<T>;
  play: (speech: T, index: number) => Promise<void>;
  isCancelled?: () => boolean;
}

type AudioElementLike = Pick<HTMLAudioElement, "src" | "onended" | "onerror" | "play" | "pause">;

type SettledSpeech<T> =
  | { ok: true; speech: T }
  | { ok: false; error: unknown };

async function startSynthesis<T>(synthesize: (chunk: string) => Promise<T>, chunk: string): Promise<SettledSpeech<T>> {
  try {
    return { ok: true, speech: await synthesize(chunk) };
  } catch (error) {
    return { ok: false, error };
  }
}

export function playAudioSource(audio: AudioElementLike, source: string, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }

    let settled = false;
    const finish = (error?: unknown, failed = false) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      audio.onended = null;
      audio.onerror = null;
      if (failed) reject(error);
      else resolve();
    };
    const onAbort = () => {
      audio.pause();
      finish();
    };

    signal.addEventListener("abort", onAbort, { once: true });
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error("speech_playback_failed"), true);
    audio.src = source;
    audio.play().catch((error) => finish(error, true));
  });
}

export async function playSpeechQueue<T>({
  chunks,
  synthesize,
  play,
  isCancelled = () => false,
}: SpeechQueueOptions<T>) {
  if (chunks.length === 0 || isCancelled()) return;

  let pending = startSynthesis(synthesize, chunks[0]!);

  for (let index = 0; index < chunks.length; index += 1) {
    const result = await pending;
    if (isCancelled()) return;
    if (!result.ok) throw result.error;

    if (index + 1 < chunks.length) {
      pending = startSynthesis(synthesize, chunks[index + 1]!);
    }

    await play(result.speech, index);
    if (isCancelled()) return;
  }
}
