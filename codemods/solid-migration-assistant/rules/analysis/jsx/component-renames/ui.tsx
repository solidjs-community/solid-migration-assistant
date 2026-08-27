import { GuidanceSections, RuleFindings } from "../../../../dashboard/finding-ui.tsx";
import { formatFindingLocation } from "../../../../dashboard/finding-model.ts";
import { defineRuleSlice } from "../../../../shared/report.ts";
import {
  COMPONENT_RENAMES_RULE_ID,
  COMPONENT_RENAMES_RULE_ROUTE,
  type ComponentRenamesReport,
} from "./report.ts";

export const componentRenamesSlice = defineRuleSlice<ComponentRenamesReport>({
  id: COMPONENT_RENAMES_RULE_ID,
  route: COMPONENT_RENAMES_RULE_ROUTE,
  title: "Component renames",
  domain: "JSX",
  kind: "analysis",
  Summary: (props) => <p>{props.report.findings.length} component sites need review</p>,
  Detail: (props) => (
    <RuleFindings findings={props.report.findings.map((finding) => ({
      filename: finding.filename,
      location: formatFindingLocation(finding.filename, finding.line, finding.column),
      label: <><code>{finding.legacyName}</code> → <code>{finding.replacement}</code></>,
      snippet: finding.snippet,
      editorTarget: {
        analyzedTargetRoot: props.run.analyzedTargetRoot,
        filename: finding.filename,
        line: finding.line,
        column: finding.column,
      },
      details: <GuidanceSections
        summary={finding.summary}
        reason={finding.reason}
        nextSteps={finding.nextSteps}
        cautions={finding.cautions}
        validation={finding.validation}
        officialGuideUrl={finding.officialGuideUrl}
      />,
    }))} />
  ),
});
