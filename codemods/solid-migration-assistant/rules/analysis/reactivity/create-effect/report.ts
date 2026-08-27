import { defineRuleReportAggregator, type SourceSnippet } from "../../../../shared/report.ts";
export const CREATE_EFFECT_RULE_ID = "analysis/reactivity/create-effect";
export const CREATE_EFFECT_RULE_ROUTE = "reactivity/create-effect";
export type CreateEffectFinding = {
  readonly filename: string; readonly line: number; readonly column: number;
  readonly argumentCount: number;
  readonly summary: string; readonly reason: string;
  readonly nextSteps: readonly string[]; readonly cautions: readonly string[];
  readonly validation: readonly string[]; readonly officialGuideUrl: string;
  readonly snippet: SourceSnippet;
};
export type CreateEffectReport = { readonly findings: readonly CreateEffectFinding[] };
export type CreateEffectContent = Pick<CreateEffectFinding, "summary" | "reason" | "nextSteps" | "cautions" | "validation" | "officialGuideUrl">;
export function formatCreateEffectGuidance(finding: CreateEffectFinding): string {
  return `${finding.filename}:${finding.line}:${finding.column} ${finding.summary}
Why: ${finding.reason}
Guidance: ${[...finding.nextSteps, ...finding.cautions, ...finding.validation].join(" ")} Official migration guide: ${finding.officialGuideUrl}`;
}
export const createEffectReportAggregator = defineRuleReportAggregator<CreateEffectReport>({
  id: CREATE_EFFECT_RULE_ID, emptyReport: () => ({ findings: [] }),
  merge: (projectReport, nextReport) => ({ findings: [...projectReport.findings, ...nextReport.findings].sort(compareFindings) }),
});
function compareFindings(left: CreateEffectFinding, right: CreateEffectFinding): number {
  const filenameOrder = left.filename < right.filename ? -1 : left.filename > right.filename ? 1 : 0;
  return filenameOrder || left.line - right.line || left.column - right.column;
}
