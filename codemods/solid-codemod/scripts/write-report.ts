import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { relative, resolve } from "path";
import {
  prepareReportDirectory,
  writeReportFile,
} from "./report-path.ts";
import {
  buildReport,
  renderHtmlReport,
  renderJsonReport,
  REPORT_STATE_KEY,
  type MigrationFinding,
} from "./report.ts";

const REPORT_WRITTEN_STATE_KEY = "solid-v2-analysis-report-written";
const DEFAULT_REPORT_DIRECTORY = ".codemod-reports/solid-v2";

const writeReport: Codemod<TSX> = async (_root, options) => {
  const release = acquireLock(REPORT_WRITTEN_STATE_KEY);
  try {
    if (getState<boolean>(REPORT_WRITTEN_STATE_KEY)) return null;

    if (options.dryRun) {
      setState(REPORT_WRITTEN_STATE_KEY, true, false);
      console.warn(
        "[solid-v2-analysis] dry-run skipped JSON and HTML report artifacts",
      );
      return null;
    }

    const outputDirectory = prepareReportDirectory(
      options.targetDir,
      options.params.report_directory ?? DEFAULT_REPORT_DIRECTORY,
    );
    const report = buildReport({
      findings: getState<MigrationFinding[]>(REPORT_STATE_KEY) ?? [],
    });
    const jsonName = "solid-v2-migration-report.json";
    const htmlName = "solid-v2-migration-report.html";
    writeReportFile(outputDirectory, jsonName, renderJsonReport(report));
    writeReportFile(outputDirectory, htmlName, renderHtmlReport(report));
    setState(REPORT_WRITTEN_STATE_KEY, true, false);

    console.warn(
      `[solid-v2-analysis] wrote ${report.summary.findings} finding(s) to ${relative(options.targetDir, resolve(outputDirectory, jsonName))} and ${relative(options.targetDir, resolve(outputDirectory, htmlName))}`,
    );
  } finally {
    release();
  }

  return null;
};

export default writeReport;
