import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const workspaceDirectory = resolve(packageDirectory, "../..");

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
  runFailure("analyze", ["--target", join(temporaryRoot, "missing")], /does not exist/);
  runFailure("transform", [], /--target is required/);

  const target = join(temporaryRoot, "fixture");
  cpSync(resolve(packageDirectory, "tests/fixture"), target, {
    recursive: true,
  });

  const sourceBeforeAnalysis = sourceSnapshot(target);
  runFromWorkspace("analyze", relative(workspaceDirectory, target));
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
    firstReport.coverage.supportedRules.map(({ ruleId }) => ruleId),
    ["S2-EFFECT-001", "S2-IMPORT-WEB-001"],
  );
  assert.equal(
    firstReport.findings.some((finding) => "nextAction" in finding),
    false,
  );
  assert.ok(firstReport.findings.every((finding) => finding.guidance.length > 0));
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
  rmSync(join(target, ".codemod-reports"), { recursive: true, force: true });
  run("transform", target);
  const appAfterTransform = readFileSync(appPath, "utf8");
  assert.equal(
    appAfterTransform,
    appBeforeTransform
      .replace('from "solid-js/web"', 'from "@solidjs/web"')
      .replace('import "solid-js/web"', 'import "@solidjs/web"'),
  );
  assert.equal(readFileSync(nonmatchesPath, "utf8"), nonmatchesBeforeTransform);
  assert.equal(existsSync(join(target, reportRelativePath)), false);

  run("transform", target);
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
  const staleReportDirectory = join(emptyTarget, ".codemod-reports", "solid-v2");
  mkdirSync(staleReportDirectory, { recursive: true });
  writeFileSync(join(emptyTarget, htmlRelativePath), "stale");
  const emptyBefore = sourceSnapshot(emptyTarget);
  run("analyze", emptyTarget);
  assert.deepEqual(sourceSnapshot(emptyTarget), emptyBefore);
  assert.equal(existsSync(join(emptyTarget, reportRelativePath)), false);
  assert.equal(existsSync(join(emptyTarget, htmlRelativePath)), false);

  console.log("workflow verification passed");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}

function run(mode, target) {
  const result = spawnSync(
    "pnpm",
    [mode, "--target", target],
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

function runFromWorkspace(mode, target) {
  const result = spawnSync("pnpm", [mode, "--target", target], {
    cwd: workspaceDirectory,
    encoding: "utf8",
    env: { ...process.env, CI: "true", INIT_CWD: workspaceDirectory },
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert.equal(result.status, 0, `${mode} exited ${result.status}`);
}

function runFailure(mode, argumentsList, message) {
  const result = spawnSync("pnpm", [mode, ...argumentsList], {
    cwd: packageDirectory,
    encoding: "utf8",
    env: { ...process.env, CI: "true" },
  });
  assert.equal(result.status, 2, `${mode} exited ${result.status}`);
  assert.match(`${result.stdout}\n${result.stderr}`, message);
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
