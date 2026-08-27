import { GuidanceSections, RuleFindings } from "../../../../dashboard/finding-ui.tsx";
import { formatFindingLocation } from "../../../../dashboard/finding-model.ts";
import { defineRuleSlice } from "../../../../shared/report.ts";
import {
  CREATE_EFFECT_RULE_ID,
  CREATE_EFFECT_RULE_ROUTE,
  type CreateEffectReport,
} from "./report.ts";

export const createEffectSlice = defineRuleSlice<CreateEffectReport>({
  id: CREATE_EFFECT_RULE_ID,
  route: CREATE_EFFECT_RULE_ROUTE,
  title: "createEffect calls",
  domain: "Reactivity",
  kind: "analysis",
  Summary: (props) => <p>{props.report.findings.length} createEffect calls need review</p>,
  Detail: (props) => (
    <RuleFindings findings={props.report.findings.map((finding) => ({
      filename: finding.filename,
      location: formatFindingLocation(finding.filename, finding.line, finding.column),
      label: `${finding.argumentCount} positional ${finding.argumentCount === 1 ? "argument" : "arguments"}`,
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
