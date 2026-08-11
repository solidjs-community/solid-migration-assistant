import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DISCLOSURE } from "../shared/run-workflow.mjs";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = resolve(packageDirectory, "../..");
const fixtureDirectory = resolve(packageDirectory, "tests/fixture");
const emptyDirectory = resolve(packageDirectory, "tests/empty");
const expectedGuidance = [
  "src/excluded.ts:3:1 [S2-COMPUTED-001] Choose a Solid 2 replacement for createComputed.\nWhy: Solid 2 removes createComputed; the correct replacement depends on whether the callback derives a value, performs an effect, or encodes stateful update logic. This call has 1 semantic argument(s).\nGuidance: Read the complete callback, its consumers, nearby signal/store declarations, and ordering assumptions. Explain the migration by default and edit only when explicitly asked. Use createMemo only for a readonly derived value that consumers read. Use Solid 2's split createEffect when reactive reads can be isolated in the compute callback and imperative work belongs in the untracked effect callback. Use function-form createSignal, or derived createStore for object and array projections, only when writable derived state is intentional. Stop without proposing a rewrite when the callback uses its previous value or an initial/options argument, writes to a dependency or may form a cycle, mixes several operations, relies on immediate or render ordering, registers cleanup, starts async work, contains nested control flow or reactive primitive creation, or has unclear ownership or consumers. Ask for the smallest focused test or runtime observation that exposes the required value, timing, and write behavior.",
  "src/excluded.ts:4:1 [S2-PROPS-001] Review mergeProps source precedence.\nWhy: Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source. This call has 2 source argument(s).\nGuidance: Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
  "src/excluded.ts:5:1 [S2-MEMO-001] Manual review required: migrate this createMemo initial value.\nWhy: Solid 1 uses createMemo's second argument as an initial value, while Solid 2 uses the second argument for options and has no initial-value parameter.\nGuidance: Migrate this call manually. First establish why the callback needs the initial value and what it must receive on its first run. Remove the legacy initial-value argument only after preserving that behavior explicitly in surrounding state or callback logic. For a three-argument call, review the legacy options object separately and move only still-supported Solid 2 options into the new second-argument position. An option-shaped second argument is still treated as a Solid 1 initial value in this migration scope. Do not perform a positional rewrite without a focused test that observes the first computed value and subsequent updates.",
  "src/language.js:1:24 Move this Solid web renderer import.\nWhy: Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.\nGuidance: Change only this static import's module source to @solidjs/web and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding. Official migration guide: https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now",
  "src/language.jsx:1:39 [S2-JSX-CLASSLIST-001] Migrate this JSX classList attribute to class object/array form.\nWhy: Solid 2 removes the JSX classList attribute in favor of the class attribute's object and array forms.\nGuidance: Move this classList value into a class object/array form, preserve static classes and conditional truthiness, and deliberately merge any existing class attribute on the same element. This analyzer does not edit source. Stop if the value is spread or forwarded, duplicate class sources have unclear precedence, or getter and side-effect evaluation could change; keep the attribute unchanged and add a focused rendering test first.",
  "src/migration-sites.tsx:14:63 [S2-IMPORT-BETA32-001] Move this Solid 2 beta.32 subpath import.\nWhy: Solid 2 beta.32 publishes solid-js/store from solid-js.\nGuidance: Change only this static import's module source from solid-js/store to solid-js, preserve its import form and quote style, and then run the application's typecheck and build. This analyzer does not edit source. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are deliberately outside this rule. Stop: do not blindly rewrite this source if the import includes removed or renamed beta.32 helpers such as unwrap, produce, createMutable, or modifyMutable. Migrate those bindings and call sites first, then move supported store imports to solid-js.",
  "src/migration-sites.tsx:15:24 Move this Solid web renderer import.\nWhy: Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.\nGuidance: Change only this static import's module source to @solidjs/web and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding. Official migration guide: https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now",
  "src/migration-sites.tsx:19:15 [S2-PROPS-001] Review mergeProps source precedence.\nWhy: Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source. This call has 2 source argument(s).\nGuidance: Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
  "src/migration-sites.tsx:20:33 [S2-PROPS-SPLIT-001] Review this splitProps tuple before using omit.\nWhy: Solid 2 replaces splitProps with omit, while this call supplies 1 key group(s) and splitProps returns a tuple whose positions and remainder can be consumed differently at each call-site.\nGuidance: Next step: trace the complete tuple destructuring or other call-site use, list the keys represented by every group, and inspect downstream reads before designing an omit-based migration. Preserve reactive property access and prove how each old tuple member will be produced. Stop without proposing a rewrite when keys are dynamic or overlapping, more than one selected group is consumed, the tuple escapes or is indexed dynamically, rest/reassignment is involved, proxy identity matters, or any consumer is unclear. This analyzer does not edit code.",
  "src/migration-sites.tsx:21:16 [S2-MEMO-001] Manual review required: migrate this createMemo initial value.\nWhy: Solid 1 uses createMemo's second argument as an initial value, while Solid 2 uses the second argument for options and has no initial-value parameter.\nGuidance: Migrate this call manually. First establish why the callback needs the initial value and what it must receive on its first run. Remove the legacy initial-value argument only after preserving that behavior explicitly in surrounding state or callback logic. For a three-argument call, review the legacy options object separately and move only still-supported Solid 2 options into the new second-argument position. An option-shaped second argument is still treated as a Solid 1 initial value in this migration scope. Do not perform a positional rewrite without a focused test that observes the first computed value and subsequent updates.",
  "src/migration-sites.tsx:22:23 [S2-STORE-CREATE-MUTABLE-001] Plan this createMutable migration to createStore.\nWhy: Solid 2 removes createMutable in favor of createStore with explicit setter-based updates; this call has 1 argument(s), while createStore also changes the created value from a directly mutable proxy to a store-and-setter tuple.\nGuidance: Next step: trace this value through all call sites, aliases, returned values, and property writes; introduce createStore only after mapping every assignment, delete, and mutating array operation to an explicit setter update and reviewing any options argument separately. Stop without proposing a rewrite when the value escapes, consumers require direct mutation or proxy identity, mutation happens through unknown helpers, setter paths cannot be identified, ownership is unclear, or focused tests do not cover reads and writes. This analyzer does not edit code.",
  "src/migration-sites.tsx:23:1 [S2-STORE-MODIFY-MUTABLE-001] Move this mutable update to an explicit store setter.\nWhy: Solid 2 removes modifyMutable as mutable stores migrate to createStore; updates must go through an explicit setter, whose draft-first callback replaces this mutation entry point only after the target store is known.\nGuidance: Next step: resolve the first argument back to its createMutable owner, inspect the entire mutation recipe, and map the update to that createStore tuple's explicit setter while preserving any path selection and sequencing. Stop without proposing a rewrite when the target origin or setter is unknown, the state or recipe escapes, mutation is delegated to an unknown helper, the callback returns a meaningful value, nested updates or async work are present, or tests do not expose the affected reads and writes. This analyzer does not edit code.",
  "src/migration-sites.tsx:26:22 [S2-STORE-UNWRAP-001] Replace this unwrap call with a reviewed snapshot.\nWhy: Solid 2 replaces unwrap with snapshot for reading a non-reactive snapshot of a reactive store, but consumers can still depend on when the value is captured and whether nested data is later observed or mutated.\nGuidance: Next step: inspect the value passed here and every consumer of the result, then consider snapshot from solid-js only after confirming that a point-in-time value is intended. Preserve the surrounding evaluation point and add a focused test for nested reads or serialization. Stop without proposing a replacement when the input may not be a Solid store, the result is mutated, retained across updates, compared by identity, passed to code with unknown ownership, or expected to remain live. This analyzer does not edit code.",
  "src/migration-sites.tsx:27:22 [S2-STORE-PRODUCE-001] Review removal of this produce wrapper.\nWhy: Solid 2 removes produce wrappers because store setters are draft-first and accept the mutation callback directly, but removing a wrapper is safe only when this value is used in that setter role.\nGuidance: Next step: inspect the immediate parent call, identify the exact store setter overload and path arguments, and review the full mutation callback before passing that callback directly to the setter. For nested produce calls, review each wrapper and its containing setter independently. Stop without proposing wrapper removal when the result is stored, returned, composed, passed through another function, used with a non-store setter, or when callback returns, nested control flow, async work, external mutation, or target ownership make draft behavior unclear. This analyzer does not edit code.",
  "src/migration-sites.tsx:31:1 [S2-COMPUTED-001] Choose a Solid 2 replacement for createComputed.\nWhy: Solid 2 removes createComputed; the correct replacement depends on whether the callback derives a value, performs an effect, or encodes stateful update logic. This call has 1 semantic argument(s).\nGuidance: Read the complete callback, its consumers, nearby signal/store declarations, and ordering assumptions. Explain the migration by default and edit only when explicitly asked. Use createMemo only for a readonly derived value that consumers read. Use Solid 2's split createEffect when reactive reads can be isolated in the compute callback and imperative work belongs in the untracked effect callback. Use function-form createSignal, or derived createStore for object and array projections, only when writable derived state is intentional. Stop without proposing a rewrite when the callback uses its previous value or an initial/options argument, writes to a dependency or may form a cycle, mixes several operations, relies on immediate or render ordering, registers cleanup, starts async work, contains nested control flow or reactive primitive creation, or has unclear ownership or consumers. Ask for the smallest focused test or runtime observation that exposes the required value, timing, and write behavior.",
  "src/migration-sites.tsx:32:1 [S2-EFFECT-001] Split this one-argument createEffect.\nWhy: Solid 2 requires separate compute and effect callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.\nGuidance: Read the full callback, imports, and nearby reactive declarations. Explain the migration by default and edit only when explicitly asked. For the supported plain shape, move reactive reads into the compute callback, return their value, and keep the imperative operation in the effect callback. Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent. Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable.",
  "src/migration-sites.tsx:36:1 [S2-LIFECYCLE-001] Review this onMount lifecycle callback.\nWhy: Solid 2 removes onMount and replaces its lifecycle role with onSettled, but the correct migration depends on the callback's work and ownership.\nGuidance: Read the full callback, its owner, and nearby cleanup registration. Explain the migration by default and edit only when explicitly asked. For a plain synchronous callback with clear ownership, consider replacing onMount with onSettled. Stop without proposing a rewrite when the callback registers cleanup, starts async work, contains nested control flow that changes lifecycle behavior, creates reactive primitives, or has unclear ownership. Ask for the smallest focused test or runtime observation that makes the required timing and cleanup behavior observable.",
  "src/migration-sites.tsx:42:5 [S2-JSX-COMPONENT-001] Migrate this imported Suspense JSX site to Loading.\nWhy: Solid 2 renames the imported solid-js Suspense component to Loading.\nGuidance: Replace only this binding-aware JSX use with Loading, review its props and children against the new component contract, and update the corresponding unaliased named import separately. This analyzer does not edit source. Stop if props are spread or forwarded, fallback or error behavior is indirect, or the component contract cannot be verified; keep the site unchanged and add a focused rendering test first.",
  "src/migration-sites.tsx:43:7 [S2-JSX-COMPONENT-001] Migrate this imported ErrorBoundary JSX site to Errored.\nWhy: Solid 2 renames the imported solid-js ErrorBoundary component to Errored.\nGuidance: Replace only this binding-aware JSX use with Errored, review its props and children against the new component contract, and update the corresponding unaliased named import separately. This analyzer does not edit source. Stop if props are spread or forwarded, fallback or error behavior is indirect, or the component contract cannot be verified; keep the site unchanged and add a focused rendering test first.",
  "src/migration-sites.tsx:44:9 [S2-JSX-COMPONENT-001] Migrate this imported SuspenseList JSX site to Reveal.\nWhy: Solid 2 renames the imported solid-js SuspenseList component to Reveal and changes the reveal-control prop names.\nGuidance: Review this site's revealOrder and tail values while migrating them to Reveal's order and collapsed props, then replace this JSX use with Reveal. This analyzer does not edit source. Stop if either prop is dynamic, forwarded, spread, or its intended reveal behavior is unclear; preserve the site and add a focused behavior test before changing it.",
  "src/migration-sites.tsx:45:11 [S2-JSX-COMPONENT-001] Migrate this imported Index JSX site to For.\nWhy: Solid 2 replaces the imported solid-js Index component with For configured for non-keyed iteration.\nGuidance: Replace this JSX use with For keyed={false}, and review the child callback shape, including whether the item and index are accessors, before adapting it. This analyzer does not edit source. Stop if callback shape, item identity, index behavior, or state preservation is unclear; keep the site unchanged and add a focused list-update test first.",
  "src/migration-sites.tsx:47:23 [S2-JSX-CLASSLIST-001] Migrate this JSX classList attribute to class object/array form.\nWhy: Solid 2 removes the JSX classList attribute in favor of the class attribute's object and array forms.\nGuidance: Move this classList value into a class object/array form, preserve static classes and conditional truthiness, and deliberately merge any existing class attribute on the same element. This analyzer does not edit source. Stop if the value is spread or forwarded, duplicate class sources have unclear precedence, or getter and side-effect evaluation could change; keep the attribute unchanged and add a focused rendering test first.",
  "src/workspace-reference.tsx:3:32 [S2-PROPS-001] Review mergeProps source precedence.\nWhy: Solid 2 replaces the user-facing mergeProps API with merge, but later properties whose value is undefined no longer fall through to an earlier source. This call has 2 source argument(s).\nGuidance: Read every source in order, identify overlapping keys, and inspect consumers of the merged object. Explain the migration by default and edit only when explicitly asked. Suggest merge from solid-js only when every later overlapping value is provably non-undefined and zero-argument behavior, result identity, and mutation do not matter. Stop without proposing a rename for spreads, any/unknown/union runtime sources, props/store proxies, function sources, getters, dynamic key presence, observed identity or mutation dependence, or fallback-through-undefined behavior. Never use the inferred Merge result type alone as runtime safety evidence. If old fallback behavior is required, preserve live reactive reads with a targeted manual guard rather than object spread or Object.assign, and ask for the smallest focused test that observes the disputed property's value.",
].join("\n");
const temporaryRoot = mkdtempSync(
  join(tmpdir(), "solid-migration-assistant-analysis-"),
);
const externalSurface = join(temporaryRoot, "external-surface");
const analyzerEnvironment = controlledAnalyzerEnvironment(externalSurface);

const workspaceExportSource = readFileSync(
  resolve(fixtureDirectory, "src/workspace-export.ts"),
  "utf8",
);
const workspaceReferenceSource = readFileSync(
  resolve(fixtureDirectory, "src/workspace-reference.tsx"),
  "utf8",
);
assert.match(workspaceExportSource, /import \{ mergeProps \} from "solid-js"/);
assert.match(workspaceExportSource, /export \{ mergeProps \}/);
assert.match(
  workspaceReferenceSource,
  /import \{ mergeProps \} from "\.\/workspace-export"/,
);
assert.doesNotMatch(workspaceReferenceSource, /solid-js/);

try {
  const fileTarget = join(temporaryRoot, "not-a-directory");
  writeFileSync(fileTarget, "not a directory\n");
  runFailure(
    ["--target"],
    "[solid-migration-assistant] --target requires a value",
  );
  runFailure(
    ["--unknown"],
    "[solid-migration-assistant] unknown argument: --unknown",
  );
  runFailure(
    ["--target", join(temporaryRoot, "missing")],
    "[solid-migration-assistant] target does not exist:",
  );
  runFailure(
    ["--target", fileTarget],
    "[solid-migration-assistant] target is not a directory:",
  );

  const target = join(temporaryRoot, "fixture");
  cpSync(fixtureDirectory, target, { recursive: true });
  assert.notEqual(target, fixtureDirectory);
  const sourceBefore = treeSnapshot(join(target, "src"));
  const targetBefore = treeSnapshot(target);

  const firstOutput = run([], target);
  const firstGuidance = normalizeGuidance(firstOutput);
  assert.equal(firstGuidance, expectedGuidance);
  const firstGuidanceBlocks = guidanceBlocks(firstGuidance);
  assert.deepEqual(firstGuidanceBlocks, [...new Set(firstGuidanceBlocks)].sort());
  assert.deepEqual(
    [...new Set(firstGuidanceBlocks.map(guidanceExtension))].sort(),
    ["js", "jsx", "ts", "tsx"],
  );
  assert.ok(
    firstGuidanceBlocks.some((entry) =>
      entry.startsWith("src/workspace-reference.tsx:3:32 "),
    ),
  );
  assert.ok(firstGuidance.includes("Manual review required"));
  assertFinalDisclosure(firstOutput);
  assert.deepEqual(treeSnapshot(join(target, "src")), sourceBefore);
  assert.deepEqual(treeSnapshot(target), targetBefore);
  assertNoPersistentArtifacts(target);
  assertDetectionOnlyTerminalOutput(firstOutput);

  const secondOutput = runFromWorkspace(relative(workspaceDirectory, target));
  const secondGuidance = normalizeGuidance(secondOutput);
  assert.deepEqual(Buffer.from(secondGuidance), Buffer.from(firstGuidance));
  assert.equal(secondGuidance, expectedGuidance);
  assert.deepEqual(treeSnapshot(join(target, "src")), sourceBefore);
  assert.deepEqual(treeSnapshot(target), targetBefore);
  assertNoPersistentArtifacts(target);
  assertDetectionOnlyTerminalOutput(secondOutput);
  assertFinalDisclosure(secondOutput);

  const emptyTarget = join(temporaryRoot, "empty");
  cpSync(emptyDirectory, emptyTarget, { recursive: true });
  assert.notEqual(emptyTarget, emptyDirectory);
  const emptyBefore = treeSnapshot(emptyTarget);
  const emptyOutput = runDirect(emptyTarget);
  assert.equal(normalizeGuidance(emptyOutput), "");
  assert.deepEqual(treeSnapshot(emptyTarget), emptyBefore);
  assertNoPersistentArtifacts(emptyTarget);
  assertDetectionOnlyTerminalOutput(emptyOutput);
  assertFinalDisclosure(emptyOutput);

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
    [
      resolve(packageDirectory, "bin/solid-migration-assistant.mjs"),
      ...argumentsList,
    ],
    {
      cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        ...analyzerEnvironment,
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
    [
      resolve(packageDirectory, "bin/solid-migration-assistant.mjs"),
      ...argumentsList,
    ],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        ...analyzerEnvironment,
        CI: "true",
        FORCE_COLOR: undefined,
        INIT_CWD: packageDirectory,
      },
    },
  );
  assert.equal(result.status, 2, `analyze exited ${result.status}`);
  const resultOutput = output(result);
  assert.deepEqual(cliDiagnostics(resultOutput), [expectedDiagnostic]);
  assertFinalDisclosure(resultOutput);
}

function controlledAnalyzerEnvironment(root) {
  const environment = {
    HOME: join(root, "home"),
    USERPROFILE: join(root, "home"),
    XDG_CONFIG_HOME: join(root, "xdg-config"),
    XDG_DATA_HOME: join(root, "xdg-data"),
    XDG_STATE_HOME: join(root, "xdg-state"),
    XDG_CACHE_HOME: join(root, "xdg-cache"),
    XDG_RUNTIME_DIR: join(root, "xdg-runtime"),
    APPDATA: join(root, "appdata"),
    LOCALAPPDATA: join(root, "local-appdata"),
    TMPDIR: join(root, "temporary"),
    TMP: join(root, "temporary"),
    TEMP: join(root, "temporary"),
  };
  for (const path of new Set(Object.values(environment))) {
    mkdirSync(path, { recursive: true });
  }
  return environment;
}

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}

function cliDiagnostics(value) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .filter(
      (line) =>
        line.startsWith("[solid-migration-assistant]") &&
        !/final disclosure/i.test(line),
    )
    .map((line) =>
      line.replace(/(target (?:does not exist|is not a directory):).*$/, "$1"),
    );
}

function normalizeGuidance(value) {
  return stripAnsi(value)
    .split(/\r?\n/)
    .filter((line) =>
      /^\s*(?:src\/[^:\n]+:\d+:\d+ |Why: |Guidance: )/.test(line),
    )
    .map((line) => line.trim())
    .join("\n");
}

function guidanceBlocks(value) {
  const lines = value.split("\n");
  assert.equal(lines.length % 3, 0);
  return Array.from({ length: lines.length / 3 }, (_, index) =>
    lines.slice(index * 3, index * 3 + 3).join("\n"),
  );
}

function guidanceExtension(value) {
  const match = /^src\/[^:\n]+\.(js|jsx|ts|tsx):/.exec(value);
  assert.ok(match?.[1], value);
  return match[1];
}

function assertFinalDisclosure(value) {
  const stripped = stripAnsi(value).trimEnd();
  assert.ok(stripped.endsWith(DISCLOSURE));
  assert.equal(
    stripped.split("[solid-migration-assistant] Final disclosure").length - 1,
    1,
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
