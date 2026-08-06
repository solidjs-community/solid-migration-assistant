import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { relative, resolve } from "path";
import {
  prepareReportDirectory,
  removeStaleReportFile,
  REPORT_DIRECTORY,
  REPORT_FILENAMES,
  writeReportFile,
} from "../shared/report-path.ts";
import {
  buildReport,
  renderHtmlReport,
  renderJsonReport,
} from "../shared/report.ts";
import {
  REPORT_STATE_KEY,
  type AnalysisState,
} from "../shared/types.ts";

const REPORT_WRITTEN_STATE_KEY = "solid-v2-analysis-report-written";
const writeReport: Codemod<TSX> = async (root, options) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const staleReportFilename = REPORT_FILENAMES.find(
    (reportFilename) => filename === `${REPORT_DIRECTORY}/${reportFilename}`,
  );
  if (staleReportFilename) {
    removeStaleReportFile(options.targetDir, staleReportFilename);
    return null;
  }

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

    const outputDirectory = prepareReportDirectory(options.targetDir);
    const state = getState<AnalysisState>(REPORT_STATE_KEY) ?? {
      rules: [],
      findings: [],
    };
    const report = buildReport(state);
    const [jsonName, htmlName] = REPORT_FILENAMES;
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
