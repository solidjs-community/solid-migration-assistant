import assert from "node:assert/strict";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  prepareReportDirectory,
  removeStaleReportFiles,
  REPORT_DIRECTORY,
  writeReportFile,
} from "./report-path.ts";

test("uses the fixed report directory inside the target", () => {
  const target = mkdtempSync(join(tmpdir(), "solid-v2-fixed-report-"));
  try {
    assert.equal(
      prepareReportDirectory(target),
      join(target, ".codemod-reports", "solid-v2"),
    );
    assert.equal(REPORT_DIRECTORY, ".codemod-reports/solid-v2");
  } finally {
    rmSync(target, { recursive: true, force: true });
  }
});

test("rejects directory symlink traversal", () => {
  const root = mkdtempSync(join(tmpdir(), "solid-v2-report-dir-"));
  try {
    const target = join(root, "target");
    const outside = join(root, "outside");
    mkdirSync(target);
    mkdirSync(outside);
    symlinkSync(outside, join(target, ".codemod-reports"));
    assert.throws(
      () => prepareReportDirectory(target),
      /symbolic link/,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("replaces a report file symlink instead of following it", () => {
  const root = mkdtempSync(join(tmpdir(), "solid-v2-report-file-"));
  try {
    const outside = join(root, "outside.json");
    const report = join(root, "report.json");
    writeFileSync(outside, "outside");
    symlinkSync(outside, report);
    writeReportFile(root, "report.json", "inside");
    assert.equal(readFileSync(outside, "utf8"), "outside");
    assert.equal(readFileSync(report, "utf8"), "inside");
    assert.equal(lstatSync(report).isSymbolicLink(), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects report filenames containing a path", () => {
  assert.throws(
    () => writeReportFile("/workspace/app", "../report.json", "{}"),
    /plain filename/,
  );
});

test("removes only stale generated report files", () => {
  const root = mkdtempSync(join(tmpdir(), "solid-v2-stale-report-"));
  try {
    const reportDirectory = prepareReportDirectory(root);
    const json = join(reportDirectory, "solid-v2-migration-report.json");
    const html = join(reportDirectory, "solid-v2-migration-report.html");
    const unrelated = join(reportDirectory, "keep.txt");
    writeFileSync(json, "stale");
    writeFileSync(html, "stale");
    writeFileSync(unrelated, "keep");

    removeStaleReportFiles(root);

    assert.equal(existsSync(json), false);
    assert.equal(existsSync(html), false);
    assert.equal(readFileSync(unrelated, "utf8"), "keep");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
