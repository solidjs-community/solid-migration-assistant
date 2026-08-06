import assert from "node:assert/strict";
import { test } from "node:test";
import { assertNoOverlaps } from "../scripts/transform.ts";

const edit = (startPos: number, endPos: number) => ({
  startPos,
  endPos,
  insertedText: "replacement",
});

test("allows edits that only touch at their boundaries", () => {
  assert.doesNotThrow(() =>
    assertNoOverlaps([edit(5, 8), edit(0, 5), edit(10, 10)]),
  );
});

test("rejects intersecting and same-position edits before committing", () => {
  assert.throws(
    () => assertNoOverlaps([edit(0, 5), edit(4, 8)]),
    /overlapping edits/,
  );
  assert.throws(
    () => assertNoOverlaps([edit(3, 3), edit(3, 3)]),
    /overlapping edits/,
  );
});
