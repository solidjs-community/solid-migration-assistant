import assert from "node:assert/strict";
import {
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
  resolveReportDirectory,
  writeReportFile,
} from "./report-path.ts";

test("keeps report paths inside the target", () => {
  assert.equal(
    resolveReportDirectory("/workspace/app", ".codemod-reports/solid-v2"),
    "/workspace/app/.codemod-reports/solid-v2",
  );
  assert.throws(
    () => resolveReportDirectory("/workspace/app", "../outside"),
    /must stay inside/,
  );
  assert.throws(
    () => resolveReportDirectory("/workspace/app", "/tmp/outside"),
    /must be relative/,
  );
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
      () => prepareReportDirectory(target, ".codemod-reports/solid-v2"),
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
