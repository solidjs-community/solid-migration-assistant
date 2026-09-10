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
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const codemodLauncher = resolve(
  packageDirectory,
  "node_modules/codemod/codemod",
);
const workflowPath = resolve(packageDirectory, "transform.yaml");
const fixtureDirectory = resolve(packageDirectory, "tests/transform-fixture");
const expectedDirectory = resolve(packageDirectory, "tests/transform-expected");

test(
  "relocates the five pure legacy subpaths plus proven solid-js/web statements, rewrites safe intrinsic classList attributes, and changes nothing else",
  () => {
    const temporaryRoot = mkdtempSync(
      join(tmpdir(), "solid-migration-assistant-transform-"),
    );
    const target = join(temporaryRoot, "target");
    try {
      cpSync(fixtureDirectory, target, { recursive: true });

      const first = runTransform(target);
      assert.equal(first.status, 0, output(first));
      assertTreeEquals(target, expectedDirectory);
      assertRelocationReport(first.stderr);
      assertClassListReport(first.stderr);
      assert.deepEqual(
        reportLines(first.stderr),
        [...reportLines(first.stderr)].sort(),
        "the combined report is not in deterministic whole-string order",
      );

      const settled = treeSnapshot(target);
      const second = runTransform(target);
      assert.equal(second.status, 0, output(second));
      assert.deepEqual(
        treeSnapshot(target),
        settled,
        "a second transform run changed the target (not idempotent)",
      );
      assert.deepEqual(
        reportLines(second.stderr),
        [],
        "a second transform run re-reported rewrites (not idempotent)",
      );
      assertNoPersistentArtifacts(target);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  },
  { timeout: 120_000 },
);

function runTransform(target) {
  return spawnSync(
    process.execPath,
    [
      codemodLauncher,
      "--disable-analytics",
      "workflow",
      "run",
      "-w",
      workflowPath,
      "-t",
      target,
      "--allow-dirty",
      "--no-interactive",
      "--no-color",
    ],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      env: { ...process.env, CI: "true", NO_COLOR: "1", FORCE_COLOR: undefined },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
}

function reportLines(stderr) {
  return stderr
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^src\/\S+:\d+:\d+ /.test(line));
}

function relocationLines(stderr) {
  return reportLines(stderr).filter((line) => line.includes("Relocate "));
}

function classListLines(stderr) {
  return reportLines(stderr).filter((line) =>
    line.includes("Rewrite the classList attribute"),
  );
}

const CLASS_LIST_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#classlist--class-objectarray-forms";

/**
 * The transform rewrites exactly the four intrinsic classList attributes whose
 * element carries no other class source and no spread; every other classList
 * attribute in the fixture tree must survive for the analyzer to report.
 */
function assertClassListReport(stderr) {
  assert.deepEqual(classListLines(stderr), [
    `src/class-list.tsx:14:14 Rewrite the classList attribute on <section> to class, preserving its value expression. Official migration guide: ${CLASS_LIST_GUIDE}`,
    `src/class-list.tsx:15:23 Rewrite the classList attribute on <div> to class, preserving its value expression. Official migration guide: ${CLASS_LIST_GUIDE}`,
    `src/class-list.tsx:16:15 Rewrite the classList attribute on <span> to class, preserving its value expression. Official migration guide: ${CLASS_LIST_GUIDE}`,
    `src/nested/deep.jsx:11:41 Rewrite the classList attribute on <div> to class, preserving its value expression. Official migration guide: ${CLASS_LIST_GUIDE}`,
  ]);
}

const LEGACY_SUBPATH_RELOCATION =
  /^src\/[^:]+:\d+:\d+ Relocate solid-js\/(?:h|html|universal|jsx-runtime|jsx-dev-runtime) to @solidjs\/(?:h|html|universal|web\/jsx-runtime|web\/jsx-dev-runtime)\. Official migration guide: https:\/\/github\.com\/solidjs\/solid\/blob\/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5\/documentation\/solid-2\.0\/MIGRATION\.md#imports-where-things-live-now$/;

const PROVEN_BINDING = "(?:Dynamic|hydrate|isServer|render)";
const WEB_PACKAGE_RELOCATION = new RegExp(
  `^src/[^:]+:\\d+:\\d+ Relocate solid-js/web to @solidjs/web for proven bindings ${PROVEN_BINDING}(?:, ${PROVEN_BINDING})*\\. Official migration guide: https://github\\.com/solidjs/solid/blob/7f416cf75dde3b89739d53b15305ac6c3c41355c/documentation/solid-2\\.0/MIGRATION\\.md#imports-where-things-live-now$`,
);

function assertRelocationReport(stderr) {
  const lines = relocationLines(stderr);
  assert.deepEqual(
    lines,
    [...lines].sort(),
    "relocation report is not in deterministic whole-string order",
  );

  const legacy = lines.filter((line) => LEGACY_SUBPATH_RELOCATION.test(line));
  const web = lines.filter((line) => WEB_PACKAGE_RELOCATION.test(line));
  assert.deepEqual(
    lines.filter((line) => !legacy.includes(line) && !web.includes(line)),
    [],
    "a relocation line matched neither the legacy subpath nor the web package format",
  );
  assert.ok(
    legacy.length >= 21,
    `expected at least 21 legacy subpath relocations, got ${legacy.length}`,
  );
  assert.equal(
    web.length,
    5,
    `expected exactly 5 proven solid-js/web relocations, got ${web.length}`,
  );
  for (const line of lines) {
    assert.doesNotMatch(line, /solid-js\/store/);
  }
  for (const line of legacy) {
    assert.doesNotMatch(line, /solid-js\/web\b/);
  }
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

function assertTreeEquals(actualDirectory, expectedDirectory) {
  assert.deepEqual(
    treeSnapshot(actualDirectory),
    treeSnapshot(expectedDirectory),
    "transformed tree differs from the expected tree",
  );
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

function output(result) {
  return `${result.stdout ?? ""}${result.stderr ?? ""}`;
}
