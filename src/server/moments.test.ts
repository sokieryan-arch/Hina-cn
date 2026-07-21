import assert from "node:assert/strict";
import test from "node:test";
import { createMomentService } from "./moments.js";
import { createMemoryAppStore } from "./store/memoryAppStore.js";

test("moment service creates once and respects the next due time", async () => {
  const store = createMemoryAppStore();
  let calls = 0;
  const provider = {
    async draftMoment() { calls += 1; return { body: "Hina found a tiny yellow umbrella today.", occasion: null }; },
  } as any;
  const service = createMomentService({
    store,
    provider,
    now: () => new Date("2026-07-22T08:00:00.000Z"),
  });
  await service.ensureMoment();
  await service.ensureMoment();
  assert.equal(calls, 1);
  assert.equal((await store.space.listMoments()).length, 1);
});

test("moment service writes a safe fallback when Ark fails", async () => {
  const store = createMemoryAppStore();
  const service = createMomentService({
    store,
    provider: { async draftMoment() { throw new Error("offline"); } } as any,
    now: () => new Date("2026-07-22T08:00:00.000Z"),
  });
  const moment = await service.ensureMoment();
  assert.ok(moment?.body);
  assert.doesNotMatch(moment!.body, /user|chat|prompt/i);
});
