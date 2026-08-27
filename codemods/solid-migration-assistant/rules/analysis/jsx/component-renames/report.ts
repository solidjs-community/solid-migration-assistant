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
  readonly summary: string;
  readonly reason: string;
  readonly nextSteps: readonly string[];
  readonly cautions: readonly string[];
  readonly validation: readonly string[];
  readonly officialGuideUrl: string;
  readonly snippet: SourceSnippet;
};
export type ComponentRenamesReport = { readonly findings: readonly ComponentRenameFinding[] };
export type ComponentRenameContent = Pick<ComponentRenameFinding, "summary" | "reason" | "nextSteps" | "cautions" | "validation" | "officialGuideUrl">;

export function formatComponentRenameGuidance(finding: ComponentRenameFinding): string {
  return `${finding.filename}:${finding.line}:${finding.column} ${finding.summary}
Why: ${finding.reason}
Guidance: ${[...finding.nextSteps, ...finding.cautions, ...finding.validation].join(" ")} Official migration guide: ${finding.officialGuideUrl}`;
}
export const componentRenamesReportAggregator = defineRuleReportAggregator<ComponentRenamesReport>({
  id: COMPONENT_RENAMES_RULE_ID,
  emptyReport: () => ({ findings: [] }),
  merge: (projectReport, nextReport) => ({ findings: [...projectReport.findings, ...nextReport.findings].sort(compareFindings) }),
});
function compareFindings(left: ComponentRenameFinding, right: ComponentRenameFinding): number {
  const filenameOrder = left.filename < right.filename ? -1 : left.filename > right.filename ? 1 : 0;
  return filenameOrder || left.line - right.line || left.column - right.column;
}
