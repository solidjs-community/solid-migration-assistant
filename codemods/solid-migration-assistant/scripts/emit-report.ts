import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { ANALYSIS_STATE_KEY } from "../shared/analysis.ts";
import { TRANSFORM_REPORT_STATE_KEY } from "../shared/transform.ts";
import { DASHBOARD_REPORT_STATE_KEY, REPORT_SCHEMA_VERSION } from "../shared/report.ts";
import type { JsonValue } from "../shared/report.ts";

const EMITTED_STATE_KEY = "solid-migration-assistant-report-emitted";

const emitReport: Codemod<TSX> = async () => {
  const release = acquireLock(EMITTED_STATE_KEY);
  try {
    if (getState<boolean>(EMITTED_STATE_KEY)) return null;

    const guidance = [
      ...new Set(getState<string[]>(ANALYSIS_STATE_KEY) ?? []),
    ];
    const report = [
      ...new Set(getState<string[]>(TRANSFORM_REPORT_STATE_KEY) ?? []),
    ];
    setState(EMITTED_STATE_KEY, true, false);

    const blocks = [
      ...(guidance.length > 0 ? [guidance.sort().join("\n\n")] : []),
      ...(report.length > 0 ? [report.sort().join("\n")] : []),
    ];
    if (blocks.length > 0) {
      console.log(blocks.join("\n\n"));
    }

    if (process.env.SOLID_MIGRATION_REPORT_MODE === "1") {
      const reports =
        getState<Record<string, JsonValue>>(DASHBOARD_REPORT_STATE_KEY) ?? {};
      console.log(
        `__SOLID_MIGRATION_REPORT_DATA__${JSON.stringify({ schemaVersion: REPORT_SCHEMA_VERSION, reports })}`,
      );
    }
  } finally {
    release();
  }

  return null;
};

export default emitReport;
