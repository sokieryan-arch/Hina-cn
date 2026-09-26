import assert from "node:assert/strict";
import test from "node:test";
import { WRITING_CALIBRATION_BENCHMARKS, validateWritingCalibrationResults, writingCalibrationAnchors } from "./writingCalibration";

test("writing calibration includes ordered Band 4-8 references for both tasks", () => {
  for (const taskType of ["task1", "task2"] as const) {
    const benchmarks = WRITING_CALIBRATION_BENCHMARKS.filter((item) => item.taskType === taskType);
    assert.deepEqual(benchmarks.map((item) => item.expectedBand), [4, 5, 6, 7, 8]);
    assert.ok(benchmarks.every((item) => item.response.length > 100));
    assert.match(writingCalibrationAnchors(taskType), /Band 8/);
  }
});

test("writing calibration detects drift and non-monotonic estimates", () => {
  const valid = [4, 5, 6, 7, 8].map((estimatedBand, index) => ({ id: `task1-band-${index + 4}`, estimatedBand }));
  assert.equal(validateWritingCalibrationResults("task1", valid), true);
  assert.throws(() => validateWritingCalibrationResults("task1", valid.map((item) => item.id === "task1-band-7" ? { ...item, estimatedBand: 4.5 } : item)), /tolerance|monotonic/);
});


