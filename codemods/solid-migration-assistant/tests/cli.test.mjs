import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { test } from "node:test";
import {
  buildCodemodArguments,
  parseTarget,
  resolveCodemodLauncher,
} from "../shared/run-workflow.mjs";

const packageDirectory = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

test("defaults the target to the invocation directory", () => {
  assert.equal(parseTarget([]), ".");
  assert.equal(parseTarget(["--target", "project"]), "project");
});

test("rejects unknown, missing, and duplicate options", () => {
  assert.throws(() => parseTarget(["project"]), /unknown argument: project/);
  assert.throws(
    () => parseTarget(["--unknown"]),
    /unknown argument: --unknown/,
  );
  assert.throws(() => parseTarget(["--target"]), /--target requires a value/);
  assert.throws(
    () => parseTarget(["--target", "first", "--target", "second"]),
    /--target may only be specified once/,
  );
});

test("runs the pinned package-local Codemod launcher with safe flags", () => {
  const launcher = resolveCodemodLauncher();
  assert.equal(
    launcher,
    resolve(dirname(require.resolve("codemod/package.json")), "codemod"),
  );
  assert.equal(require("codemod/package.json").version, "1.12.13");

  const target = resolve(packageDirectory, "example");
  assert.deepEqual(buildCodemodArguments(target), [
    "--disable-analytics",
    "workflow",
    "run",
    "-w",
    resolve(packageDirectory, "workflow.yaml"),
    "-t",
    target,
    "--allow-dirty",
    "--no-interactive",
  ]);
});
