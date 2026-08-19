import { RuleFindings } from "../../../../dashboard/finding-ui.tsx";
import { formatFindingLocation } from "../../../../dashboard/finding-model.ts";
import { defineRuleSlice } from "../../../../shared/report.ts";
import {
  WEB_IMPORT_RULE_ID,
  WEB_IMPORT_RULE_ROUTE,
  type WebImportReport,
} from "./report.ts";

export const webImportSlice = defineRuleSlice<WebImportReport>({
  id: WEB_IMPORT_RULE_ID,
  route: WEB_IMPORT_RULE_ROUTE,
  title: "Web renderer imports",
  domain: "Imports",
  kind: "analysis",
  Summary: (props) => (
    <p>{props.report.findings.length} legacy web import sites</p>
  ),
  Detail: (props) => (
    <RuleFindings findings={props.report.findings.map((finding) => ({
      filename: finding.filename,
      location: formatFindingLocation(finding.filename, finding.line, finding.column),
      label: finding.form,
      snippet: finding.snippet.text,
      guidance: finding.guidance,
    }))} />
  ),
});
