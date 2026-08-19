import { defineRuleReportAggregator, type SourceSnippet } from "../../../../shared/report.ts";
export const COMPONENT_RENAMES_RULE_ID = "analysis/jsx/component-renames";
export const COMPONENT_RENAMES_RULE_ROUTE = "jsx/component-renames";
export type LegacyComponentName = "Suspense" | "ErrorBoundary" | "SuspenseList" | "Index";
export type ComponentRenameFinding = {
  readonly filename: string;
  readonly line: number;
  readonly column: number;
  readonly legacyName: LegacyComponentName;
  readonly replacement: string;
  readonly guidance: string;
  readonly snippet: SourceSnippet;
};
export type ComponentRenamesReport = {
  readonly findings: readonly ComponentRenameFinding[];
};
export const componentRenamesReportAggregator = defineRuleReportAggregator<ComponentRenamesReport>({
  id: COMPONENT_RENAMES_RULE_ID,
  emptyReport: () => ({ findings: [] }),
  merge: (projectReport, nextReport) => ({
    findings: [...projectReport.findings, ...nextReport.findings].sort(compareFindings),
  }),
});

function compareFindings(left: ComponentRenameFinding, right: ComponentRenameFinding): number {
  const filenameOrder = left.filename < right.filename ? -1 : left.filename > right.filename ? 1 : 0;
  return filenameOrder || left.line - right.line || left.column - right.column;
}
