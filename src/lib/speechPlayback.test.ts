import test from "node:test";
import assert from "node:assert/strict";
import { playAudioSource, playSpeechQueue } from "./speechPlayback.js";

test("prefetches the next speech chunk before playing the current one", async () => {
  const events: string[] = [];

  await playSpeechQueue({
    chunks: ["one", "two", "three"],
    async synthesize(chunk) {
      events.push(`synthesize:${chunk}`);
      return chunk.toUpperCase();
    },
    async play(speech, index) {
      events.push(`play:${index}:${speech}`);
    },
  });

  assert.deepEqual(events, [
    "synthesize:one",
    "synthesize:two",
    "play:0:ONE",
    "synthesize:three",
    "play:1:TWO",
    "play:2:THREE",
  ]);
});

test("stops the speech queue cleanly after cancellation", async () => {
  const played: string[] = [];
  let cancelled = false;

  await playSpeechQueue({
    chunks: ["one", "two"],
    async synthesize(chunk) {
      return chunk;
    },
    async play(speech) {
      played.push(speech);
      cancelled = true;
    },
    isCancelled: () => cancelled,
  });

  assert.deepEqual(played, ["one"]);
});

test("reuses one unlocked audio element for every speech chunk", async () => {
  const playedSources: string[] = [];
  const audio = {
    src: "",
    onended: null as null | (() => void),
    onerror: null as null | (() => void),
    async play() {
      playedSources.push(this.src);
      queueMicrotask(() => this.onended?.());
    },
    pause() {},
  };
  const controller = new AbortController();

  await playSpeechQueue({
    chunks: ["first", "second"],
    async synthesize(chunk) {
      return `data:audio/mpeg;base64,${chunk}`;
    },
    play: (source) => playAudioSource(audio, source, controller.signal),
  });

  assert.deepEqual(playedSources, [
    "data:audio/mpeg;base64,first",
    "data:audio/mpeg;base64,second",
  ]);
});
