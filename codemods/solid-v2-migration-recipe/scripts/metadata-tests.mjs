import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const workflow = readFileSync(new URL("../workflow.yaml", import.meta.url), "utf8");

const expectedOrder = [
  "solid-v2-json-config",
  "solid-v2-imports",
  "solid-v2-jsx-types",
  "solid-v2-jsx-shapes",
  "solid-v2-runtime-safe",
  "solid-v2-review-markers",
];

test("recipe lists Solid v2 package steps in the intended order", () => {
  let previous = -1;
  for (const source of expectedOrder) {
    const index = workflow.indexOf(`source: "${source}"`);
    assert.notEqual(index, -1, `${source} is present`);
    assert.ok(index > previous, `${source} appears after the previous package`);
    previous = index;
  }
});

test("recipe delegates to each focused codemod exactly once", () => {
  for (const source of expectedOrder) {
    const matches = [...workflow.matchAll(new RegExp(`source: \"${source}\"`, "g"))];
    assert.equal(matches.length, 1, `${source} appears once`);
  }
});

test("recipe stays orchestration-only", () => {
  assert.equal(workflow.includes("js-ast-grep:"), false, "recipe should not embed transform scripts");
  assert.equal(workflow.includes("solid-codemod"), false, "recipe should not delegate to the legacy monolith");
});
