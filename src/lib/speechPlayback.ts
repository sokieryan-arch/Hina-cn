interface SpeechQueueOptions<T> {
  chunks: string[];
  synthesize: (chunk: string) => Promise<T>;
  play: (speech: T, index: number) => Promise<void>;
  isCancelled?: () => boolean;
}

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
