import { defineRuleReportAggregator, type SourceSnippet } from "../../../../shared/report.ts";
export const WEB_IMPORT_RULE_ID = "analysis/imports/web-import";
export const WEB_IMPORT_RULE_ROUTE = "imports/web-import";
export type WebImportForm = "import" | "re-export" | "dynamic-import" | "require";
export type WebImportFinding = {
  readonly filename: string;
  readonly line: number;
  readonly column: number;
  readonly form: WebImportForm;
  readonly summary: string;
  readonly reason: string;
  readonly nextSteps: readonly string[];
  readonly cautions: readonly string[];
  readonly validation: readonly string[];
  readonly officialGuideUrl: string;
  readonly snippet: SourceSnippet;
};
export type WebImportReport = { readonly findings: readonly WebImportFinding[] };

export function formatWebImportGuidance(finding: WebImportFinding): string {
  return `${finding.filename}:${finding.line}:${finding.column} ${finding.summary}
Why: ${finding.reason}
Guidance: ${[...finding.nextSteps, ...finding.cautions, ...finding.validation].join(" ")} Official migration guide: ${finding.officialGuideUrl}`;
}

export const webImportReportAggregator = defineRuleReportAggregator<WebImportReport>({
  id: WEB_IMPORT_RULE_ID,
  emptyReport: () => ({ findings: [] }),
  merge: (projectReport, nextReport) => ({
    findings: [...projectReport.findings, ...nextReport.findings].sort(compareFindings),
  }),
});
function compareFindings(left: WebImportFinding, right: WebImportFinding): number {
  const filenameOrder = left.filename < right.filename ? -1 : left.filename > right.filename ? 1 : 0;
  return filenameOrder || left.line - right.line || left.column - right.column;
}
