import {
  linkSync,
  mkdtempSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

const EMPTY_REPORT = '{"schemaVersion":1,"reports":{}}';

export function renderReportHtml(template, reportData) {
  const value = JSON.parse(reportData);
  assertEnvelope(value);
  const embedded = JSON.stringify(value)
    .replaceAll("&", "\\u0026")
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll(" ", "\\u2028")
    .replaceAll(" ", "\\u2029");
  const markerCount = template.split(EMPTY_REPORT).length - 1;
  if (markerCount !== 1) {
    throw new Error(`dashboard template must contain exactly one empty report marker; found ${markerCount}`);
  }
  return template.replace(EMPTY_REPORT, embedded);
}

export function writeReportAtomically(path, html, { force = false } = {}) {
  const parent = dirname(path);
  const temporaryDirectory = mkdtempSync(join(parent, ".solid-migration-report-"));
  const temporaryPath = join(temporaryDirectory, "report.html");
  try {
    writeFileSync(temporaryPath, html, { encoding: "utf8", flag: "wx", mode: 0o600 });
    if (force) {
      renameSync(temporaryPath, path);
    } else {
      linkSync(temporaryPath, path);
      unlinkSync(temporaryPath);
    }
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function assertEnvelope(value) {
  if (!isPlainObject(value) || value.schemaVersion !== 1 || !isPlainObject(value.reports)) {
    throw new Error("workflow returned an invalid report envelope");
  }
}
function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
