import { defineRuleReportAggregator, type SourceSnippet } from "../../../../shared/report.ts";
export const LEGACY_SUBPATH_RELOCATION_RULE_ID = "transformation/imports/legacy-subpath-relocation";
export const LEGACY_SUBPATH_RELOCATION_RULE_ROUTE = "imports/legacy-subpath-relocation";
export type RelocationForm = "import" | "re-export" | "dynamic-import" | "require";
export type LegacySubpathRelocationFinding = {
  readonly filename: string;
  readonly line: number;
  readonly column: number;
  readonly form: RelocationForm;
  readonly sourceModule: string;
  readonly replacementModule: string;
  readonly guidance: string;
  readonly snippet: SourceSnippet;
};
export type LegacySubpathRelocationReport = {
  readonly findings: readonly LegacySubpathRelocationFinding[];
};
export const legacySubpathRelocationReportAggregator = defineRuleReportAggregator<LegacySubpathRelocationReport>({
  id: LEGACY_SUBPATH_RELOCATION_RULE_ID,
  emptyReport: () => ({ findings: [] }),
  merge: (projectReport, nextReport) => ({
    findings: [...projectReport.findings, ...nextReport.findings].sort(compareFindings),
  }),
});

function compareFindings(left: LegacySubpathRelocationFinding, right: LegacySubpathRelocationFinding): number {
  const filenameOrder = left.filename < right.filename ? -1 : left.filename > right.filename ? 1 : 0;
  return filenameOrder || left.line - right.line || left.column - right.column;
}
