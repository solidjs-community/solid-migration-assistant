import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = resolve(packageDirectory, "../..");
const fixtureDirectory = resolve(packageDirectory, "tests/fixture");
const emptyDirectory = resolve(packageDirectory, "tests/empty");
const expectedGuidance = [
  "src/migration-sites.tsx:9:24 [S2-IMPORT-WEB-001] Move this Solid web renderer import.",
  "Why: Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.",
  "Guidance: Change only this static import's module source to @solidjs/web, preserve its import form and quote style, and then run the application's typecheck and build. This analyzer does not edit source. Re-exports, dynamic imports, require calls, and TypeScript import types are deliberately outside this rule.",
  "src/migration-sites.tsx:13:15 [S2-PROPS-001] Review mergeProps source precedence.",
  "Why: Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source. This call has 2 source argument(s).",
  "Guidance: Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
  "src/migration-sites.tsx:14:16 [S2-MEMO-001] Migrate this createMemo initial value manually.",
  "Why: Solid 1 uses createMemo's second argument as an initial value, while Solid 2 uses the second argument for options and has no initial-value parameter.",
  "Guidance: Migrate this call manually. First establish why the callback needs the initial value and what it must receive on its first run. Remove the legacy initial-value argument only after preserving that behavior explicitly in surrounding state or callback logic. For a three-argument call, review the legacy options object separately and move only still-supported Solid 2 options into the new second-argument position. An option-shaped second argument is still treated as a Solid 1 initial value in this migration scope. Do not perform a positional rewrite without a focused test that observes the first computed value and subsequent updates.",
  "src/migration-sites.tsx:16:1 [S2-COMPUTED-001] Choose a Solid 2 replacement for createComputed.",
  "Why: Solid 2 removes createComputed; the correct replacement depends on whether the callback derives a value, performs an effect, or encodes stateful update logic. This call has 1 semantic argument(s).",
  "Guidance: Read the complete callback, its consumers, nearby signal/store declarations, and ordering assumptions. Explain the migration by default and edit only when explicitly asked. Use createMemo only for a readonly derived value that consumers read. Use Solid 2's split createEffect when reactive reads can be isolated in the compute callback and imperative work belongs in the untracked effect callback. Use function-form createSignal, or derived createStore for object and array projections, only when writable derived state is intentional. Stop without proposing a rewrite when the callback uses its previous value or an initial/options argument, writes to a dependency or may form a cycle, mixes several operations, relies on immediate or render ordering, registers cleanup, starts async work, contains nested control flow or reactive primitive creation, or has unclear ownership or consumers. Ask for the smallest focused test or runtime observation that exposes the required value, timing, and write behavior.",
  "src/migration-sites.tsx:17:1 [S2-EFFECT-001] Split this one-argument createEffect.",
  "Why: Solid 2 requires separate compute and effect callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.",
  "Guidance: Read the full callback, imports, and nearby reactive declarations. Explain the migration by default and edit only when explicitly asked. For the supported plain shape, move reactive reads into the compute callback, return their value, and keep the imperative operation in the effect callback. Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent. Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable.",
  "src/migration-sites.tsx:21:1 [S2-LIFECYCLE-001] Review this onMount lifecycle callback.",
  "Why: Solid 2 removes onMount and replaces its lifecycle role with onSettled, but the correct migration depends on the callback's work and ownership.",
  "Guidance: Read the full callback, its owner, and nearby cleanup registration. Explain the migration by default and edit only when explicitly asked. For a plain synchronous callback with clear ownership, consider replacing onMount with onSettled. Stop without proposing a rewrite when the callback registers cleanup, starts async work, contains nested control flow that changes lifecycle behavior, creates reactive primitives, or has unclear ownership. Ask for the smallest focused test or runtime observation that makes the required timing and cleanup behavior observable.",
].join("\n");
const expectedRuleIds = [
  "S2-IMPORT-WEB-001",
  "S2-PROPS-001",
  "S2-MEMO-001",
  "S2-COMPUTED-001",
  "S2-EFFECT-001",
  "S2-LIFECYCLE-001",
];
const temporaryRoot = mkdtempSync(join(tmpdir(), "solid-v2-analysis-"));

try {
  const fileTarget = join(temporaryRoot, "not-a-directory");
  writeFileSync(fileTarget, "not a directory\n");
  runFailure([], "[solid-v2-codemod] --target is required");
  runFailure(["--target"], "[solid-v2-codemod] --target requires a value");
  runFailure(["--unknown"], "[solid-v2-codemod] unknown argument: --unknown");
  runFailure(
    ["--target", join(temporaryRoot, "missing")],
    "[solid-v2-codemod] target does not exist:",
  );
  runFailure(
    ["--target", fileTarget],
    "[solid-v2-codemod] target is not a directory:",
  );

  const target = join(temporaryRoot, "fixture");
  cpSync(fixtureDirectory, target, { recursive: true });
  assert.notEqual(target, fixtureDirectory);
  const sourceBefore = treeSnapshot(join(target, "src"));
  const targetBefore = treeSnapshot(target);

  const firstOutput = runFromWorkspace(relative(workspaceDirectory, target));
  const firstGuidance = normalizeGuidance(firstOutput);
  assert.equal(firstGuidance, expectedGuidance);
  assert.deepEqual(ruleIds(firstGuidance), expectedRuleIds);
  assert.deepEqual(treeSnapshot(join(target, "src")), sourceBefore);
  assert.deepEqual(treeSnapshot(target), targetBefore);
  assertNoPersistentArtifacts(target);
  assertDetectionOnlyTerminalOutput(firstOutput);

  const secondOutput = runDirect(target);
  const secondGuidance = normalizeGuidance(secondOutput);
  assert.deepEqual(Buffer.from(secondGuidance), Buffer.from(firstGuidance));
  assert.equal(secondGuidance, expectedGuidance);
  assert.deepEqual(treeSnapshot(join(target, "src")), sourceBefore);
  assert.deepEqual(treeSnapshot(target), targetBefore);
  assertNoPersistentArtifacts(target);
  assertDetectionOnlyTerminalOutput(secondOutput);

  const emptyTarget = join(temporaryRoot, "empty");
  cpSync(emptyDirectory, emptyTarget, { recursive: true });
  assert.notEqual(emptyTarget, emptyDirectory);
  const emptyBefore = treeSnapshot(emptyTarget);
  const emptyOutput = runDirect(emptyTarget);
  assert.equal(normalizeGuidance(emptyOutput), "");
  assert.deepEqual(treeSnapshot(emptyTarget), emptyBefore);
  assertNoPersistentArtifacts(emptyTarget);
  assertDetectionOnlyTerminalOutput(emptyOutput);

  console.log("workflow verification passed");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function runDirect(target) {
  return run(["--target", target], packageDirectory);
}

function runFromWorkspace(target) {
  return run(["--target", target], workspaceDirectory);
}

function run(argumentsList, cwd) {
  const result = spawnSync(
    process.execPath,
    [resolve(packageDirectory, "shared/run-workflow.mjs"), ...argumentsList],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        FORCE_COLOR: undefined,
        INIT_CWD: cwd,
      },
    },
  );
  if (result.status !== 0) process.stderr.write(output(result));
  assert.equal(result.status, 0, `analyze exited ${result.status}`);
  return output(result);
}

function runFailure(argumentsList, expectedDiagnostic) {
  const result = spawnSync(
    process.execPath,
    [resolve(packageDirectory, "shared/run-workflow.mjs"), ...argumentsList],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        CI: "true",
        FORCE_COLOR: undefined,
        INIT_CWD: packageDirectory,
      },
    },
  );
  assert.equal(result.status, 2, `analyze exited ${result.status}`);
  assert.deepEqual(cliDiagnostics(output(result)), [expectedDiagnostic]);
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function cliDiagnostics(value) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .filter((line) => line.startsWith("[solid-v2-codemod]"))
    .map((line) =>
      line.replace(/(target (?:does not exist|is not a directory):).*$/, "$1"),
    );
}

function normalizeGuidance(value) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .filter((line) =>
      /^\s*(?:src\/[^:\n]+:\d+:\d+ \[S2-[^\]]+\]|Why: |Guidance: )/.test(line),
    )
    .map((line) => line.trim())
    .join("\n");
}

function ruleIds(value) {
  return [...value.matchAll(/^src\/.* \[(S2-[^\]]+)\]/gm)].map(
    (match) => match[1],
  );
}

function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

function assertDetectionOnlyTerminalOutput(value) {
  assert.doesNotMatch(
    stripAnsi(value),
    /codemod-reports|migration report|safe-transform|agent-guided|confidence/i,
  );
}

function assertNoPersistentArtifacts(target) {
  for (const path of [
    ".codemod",
    ".codemod-reports",
    "build",
    "coverage",
    "dist",
  ]) {
    assert.equal(existsSync(join(target, path)), false, path);
  }
}

function treeSnapshot(root) {
  const snapshot = {};
  visit(root, root, snapshot);
  return snapshot;
}

function visit(root, directory, snapshot) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort(
    (left, right) => left.name.localeCompare(right.name),
  )) {
    const path = join(directory, entry.name);
    const relativePath = relative(root, path).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      snapshot[`directory:${relativePath}`] = true;
      visit(root, path, snapshot);
      continue;
    }
    if (!entry.isFile()) continue;
    snapshot[`file:${relativePath}`] = createHash("sha256")
      .update(readFileSync(path))
      .digest("hex");
  }
}
