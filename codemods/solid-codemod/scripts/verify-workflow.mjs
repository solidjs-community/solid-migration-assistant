import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runner = resolve(packageDirectory, "scripts/run-workflow.mjs");
const reportRelativePath = join(
  ".codemod-reports",
  "solid-v2",
  "solid-v2-migration-report.json",
);
const htmlRelativePath = join(
  ".codemod-reports",
  "solid-v2",
  "solid-v2-migration-report.html",
);
const temporaryRoot = mkdtempSync(join(tmpdir(), "solid-v2-analysis-"));

try {
  runFailure("analyze", join(temporaryRoot, "missing"), 2);

  const target = join(temporaryRoot, "fixture");
  cpSync(resolve(packageDirectory, "tests/fixture"), target, {
    recursive: true,
  });

  const sourceBeforeAnalysis = sourceSnapshot(target);
  run("analyze", target);
  assert.deepEqual(sourceSnapshot(target), sourceBeforeAnalysis);

  const firstReport = readReport(target);
  assert.equal(firstReport.schemaVersion, 1);
  assert.equal(firstReport.summary.findings, 3);
  assert.deepEqual(firstReport.summary.byRoute, {
    "safe-transform": 2,
    "agent-guided": 1,
    manual: 0,
  });
  assert.deepEqual(firstReport.summary.byRule, {
    "S2-EFFECT-001": 1,
    "S2-IMPORT-WEB-001": 2,
  });
  assert.deepEqual(
    [...new Set(firstReport.findings.map((finding) => finding.location.file))],
    ["src/App.tsx"],
  );
  assert.ok(
    firstReport.findings.every(
      (finding) =>
        finding.confidence === "high" && finding.excerpt.text.length > 0,
    ),
  );
  assert.match(
    readFileSync(join(target, htmlRelativePath), "utf8"),
    /Solid 2 migration report/,
  );

  run("analyze", target);
  const secondReport = readReport(target);
  assert.deepEqual(
    secondReport.findings.map(({ id }) => id),
    firstReport.findings.map(({ id }) => id),
  );
  assert.deepEqual(sourceSnapshot(target), sourceBeforeAnalysis);

  const appPath = join(target, "src/App.tsx");
  const nonmatchesPath = join(target, "src/nonmatches.tsx");
  const appBeforeTransform = readFileSync(appPath, "utf8");
  const nonmatchesBeforeTransform = readFileSync(nonmatchesPath, "utf8");
  run("transform:web-imports", target);
  const appAfterTransform = readFileSync(appPath, "utf8");
  assert.equal(
    appAfterTransform,
    appBeforeTransform
      .replace('from "solid-js/web"', 'from "@solidjs/web"')
      .replace('import "solid-js/web"', 'import "@solidjs/web"'),
  );
  assert.equal(readFileSync(nonmatchesPath, "utf8"), nonmatchesBeforeTransform);

  run("transform:web-imports", target);
  assert.equal(readFileSync(appPath, "utf8"), appAfterTransform);

  run("analyze", target);
  const afterTransformReport = readReport(target);
  assert.equal(afterTransformReport.summary.findings, 1);
  assert.deepEqual(afterTransformReport.summary.byRoute, {
    "safe-transform": 0,
    "agent-guided": 1,
    manual: 0,
  });
  assert.equal(afterTransformReport.findings[0]?.ruleId, "S2-EFFECT-001");

  const emptyTarget = join(temporaryRoot, "empty");
  cpSync(resolve(packageDirectory, "tests/empty"), emptyTarget, {
    recursive: true,
  });
  const emptyBefore = sourceSnapshot(emptyTarget);
  run("analyze", emptyTarget);
  assert.deepEqual(sourceSnapshot(emptyTarget), emptyBefore);
  const emptyReport = readReport(emptyTarget);
  assert.equal(emptyReport.summary.findings, 0);
  assert.deepEqual(emptyReport.findings, []);

  console.log("workflow verification passed");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function run(mode, target) {
  const result = spawnSync(
    process.execPath,
    [runner, mode, "--target", target],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    },
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `${mode} exited ${result.status}`);
}

function runFailure(mode, target, expectedStatus) {
  const result = spawnSync(
    process.execPath,
    [runner, mode, "--target", target],
    {
      cwd: packageDirectory,
      encoding: "utf8",
      env: { ...process.env, CI: "true" },
    },
  );
  assert.equal(result.status, expectedStatus);
  assert.match(result.stderr, /target does not exist/);
}

function readReport(target) {
  return JSON.parse(readFileSync(join(target, reportRelativePath), "utf8"));
}

function sourceSnapshot(root) {
  const snapshot = {};
  visit(root, snapshot);
  return snapshot;
}

function visit(directory, snapshot) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === ".codemod-reports" || entry.name === "node_modules") {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      visit(path, snapshot);
      continue;
    }
    if (!entry.isFile()) continue;
    const contents = readFileSync(path);
    snapshot[relative(temporaryRoot, path)] = createHash("sha256")
      .update(contents)
      .digest("hex");
  }
}
