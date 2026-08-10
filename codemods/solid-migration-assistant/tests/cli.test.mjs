import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import {
  buildCodemodArguments,
  main,
  parseTarget,
  resolveCodemodLauncher,
  runCodemod,
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
  const codemodPackage = require("codemod/package.json");
  assert.equal(codemodPackage.version, "1.12.13");
  assert.deepEqual(Object.keys(codemodPackage.optionalDependencies).sort(), [
    "@codemod.com/cli-darwin-arm64",
    "@codemod.com/cli-darwin-x64",
    "@codemod.com/cli-linux-arm64-gnu",
    "@codemod.com/cli-linux-x64-gnu",
    "@codemod.com/cli-win32-x64-msvc",
  ]);

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

test("delegates runtime availability to the pinned Codemod launcher", () => {
  const target = resolve(packageDirectory, "example");
  let invocation;
  const result = runCodemod(target, {
    spawnImpl: (executable, argumentsList, options) => {
      invocation = { executable, argumentsList, options };
      return { status: 23 };
    },
  });

  assert.equal(result.status, 23);
  assert.equal(invocation.executable, process.execPath);
  assert.deepEqual(invocation.argumentsList, [
    resolveCodemodLauncher(),
    ...buildCodemodArguments(target),
  ]);
  assert.deepEqual(invocation.options, {
    cwd: packageDirectory,
    stdio: "inherit",
  });
  assert.equal(Object.hasOwn(invocation.options, "env"), false);
});

test("does not reject platforms before invoking Codemod", () => {
  let receivedTarget;
  const status = main([], {
    cwd: packageDirectory,
    platform: "assistant-does-not-preflight-this",
    architecture: "assistant-does-not-preflight-this",
    glibcVersionRuntime: undefined,
    runImpl: (target) => {
      receivedTarget = target;
      return { status: 0 };
    },
  });

  assert.equal(status, 0);
  assert.equal(receivedTarget, packageDirectory);
});

test("reports deterministic missing and non-directory target diagnostics", () => {
  const surface = mkdtempSync(join(tmpdir(), "sma-cli-target-test-"));
  const fileTarget = join(surface, "file-target");
  writeFileSync(fileTarget, "not a directory\n");
  const diagnostics = [];
  const originalError = console.error;
  console.error = (...values) => diagnostics.push(values.join(" "));

  try {
    assert.equal(
      main(["--target", "missing"], {
        cwd: surface,
        runImpl: () => assert.fail("must not launch Codemod"),
      }),
      2,
    );
    assert.equal(
      main(["--target", fileTarget], {
        cwd: surface,
        runImpl: () => assert.fail("must not launch Codemod"),
      }),
      2,
    );
  } finally {
    console.error = originalError;
    rmSync(surface, { recursive: true, force: true });
  }

  assert.deepEqual(diagnostics, [
    `[solid-migration-assistant] target does not exist: ${join(surface, "missing")}`,
    `[solid-migration-assistant] target is not a directory: ${fileTarget}`,
  ]);
});
