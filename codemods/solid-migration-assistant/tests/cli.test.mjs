import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import {
  buildCodemodArguments,
  main,
  parseTarget,
  resolveCodemodLauncher,
  runCodemod,
  unsupportedPlatformReason,
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

test("accepts only the supported native platform matrix", () => {
  assert.equal(
    unsupportedPlatformReason({
      platform: "darwin",
      architecture: "arm64",
    }),
    undefined,
  );
  assert.equal(
    unsupportedPlatformReason({
      platform: "darwin",
      architecture: "x64",
    }),
    undefined,
  );
  assert.equal(
    unsupportedPlatformReason({
      platform: "linux",
      architecture: "arm64",
      glibcVersionRuntime: "2.39",
    }),
    undefined,
  );
  assert.equal(
    unsupportedPlatformReason({
      platform: "linux",
      architecture: "x64",
      glibcVersionRuntime: "2.39",
    }),
    undefined,
  );
  assert.match(
    unsupportedPlatformReason({
      platform: "win32",
      architecture: "x64",
    }),
    /Windows is temporarily unsupported.*isolatable state-directory override/,
  );
  assert.match(
    unsupportedPlatformReason({
      platform: "linux",
      architecture: "x64",
    }),
    /Alpine\/musl Linux is unsupported/,
  );
  assert.match(
    unsupportedPlatformReason({
      platform: "darwin",
      architecture: "ia32",
    }),
    /supports only macOS x64\/arm64 and glibc Linux x64\/arm64/,
  );
});

test("rejects Windows before starting the Codemod child", () => {
  let spawned = false;
  const diagnostics = [];
  const originalError = console.error;
  console.error = (...values) => diagnostics.push(values.join(" "));
  try {
    const status = main([], {
      platform: "win32",
      architecture: "x64",
      cwd: packageDirectory,
      runImpl: () => {
        spawned = true;
        return { status: 0 };
      },
    });
    assert.equal(status, 2);
  } finally {
    console.error = originalError;
  }

  assert.equal(spawned, false);
  assert.deepEqual(diagnostics, [
    "[solid-migration-assistant] unsupported platform: Windows is temporarily unsupported because codemod@1.12.13 does not expose an isolatable state-directory override",
  ]);
});

test(
  "rejects unsupported platforms before reading a vanished cwd",
  { skip: process.platform === "win32" },
  () => {
    const originalCwd = process.cwd();
    const vanishedCwd = mkdtempSync(join(tmpdir(), "sma-vanished-cwd-"));
    let spawned = false;
    const diagnostics = [];
    const originalError = console.error;

    process.chdir(vanishedCwd);
    rmSync(vanishedCwd, { recursive: true, force: true });
    console.error = (...values) => diagnostics.push(values.join(" "));
    try {
      assert.throws(() => process.cwd(), { code: "ENOENT" });
      const status = main([], {
        platform: "win32",
        architecture: "x64",
        cwd: undefined,
        runImpl: () => {
          spawned = true;
          return { status: 0 };
        },
      });
      assert.equal(status, 2);
    } finally {
      console.error = originalError;
      process.chdir(originalCwd);
    }

    assert.equal(spawned, false);
    assert.equal(existsSync(vanishedCwd), false);
    assert.deepEqual(diagnostics, [
      "[solid-migration-assistant] unsupported platform: Windows is temporarily unsupported because codemod@1.12.13 does not expose an isolatable state-directory override",
    ]);
  },
);

test("cleans the private child sandbox on nonzero and thrown failures", () => {
  const surface = mkdtempSync(join(tmpdir(), "sma-sandbox-test-"));
  const temporaryDirectory = join(surface, "temporary");
  mkdirSync(temporaryDirectory);

  try {
    const nonzero = runCodemod(resolve(surface, "target"), {
      temporaryDirectory,
      spawnImpl: sandboxWritingSpawn({ status: 23 }),
    });
    assert.equal(nonzero.status, 23);
    assert.deepEqual(readdirSync(temporaryDirectory), []);

    assert.throws(
      () =>
        runCodemod(resolve(surface, "target"), {
          temporaryDirectory,
          spawnImpl: sandboxWritingSpawn(new Error("child spawn failed")),
        }),
      /child spawn failed/,
    );
    assert.deepEqual(readdirSync(temporaryDirectory), []);
  } finally {
    rmSync(surface, { recursive: true, force: true });
  }
});

function sandboxWritingSpawn(result) {
  return (executable, argumentsList, options) => {
    assert.equal(executable, process.execPath);
    assert.ok(argumentsList.includes("--disable-analytics"));

    const { env } = options;
    assert.equal(env.HOME, env.USERPROFILE);
    assert.equal(env.TMPDIR, env.TMP);
    assert.equal(env.TMP, env.TEMP);
    const sandboxRoot = dirname(env.HOME);
    if (process.platform !== "win32") {
      assert.equal(statSync(sandboxRoot).mode & 0o777, 0o700);
    }

    for (const path of new Set([
      env.HOME,
      env.XDG_CONFIG_HOME,
      env.XDG_DATA_HOME,
      env.XDG_STATE_HOME,
      env.XDG_CACHE_HOME,
      env.XDG_RUNTIME_DIR,
      env.APPDATA,
      env.LOCALAPPDATA,
      env.TMPDIR,
    ])) {
      assert.doesNotMatch(relative(sandboxRoot, path), /^\.\.(?:[\\/]|$)/);
      writeFileSync(join(path, "child-state.json"), "{}\n");
    }

    if (result instanceof Error) throw result;
    return result;
  };
}
