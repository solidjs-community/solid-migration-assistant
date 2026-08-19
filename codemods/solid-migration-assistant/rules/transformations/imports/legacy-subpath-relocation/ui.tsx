import { RuleFindings } from "../../../../dashboard/finding-ui.tsx";
import { defineRuleSlice } from "../../../../shared/report.ts";
import {
  LEGACY_SUBPATH_RELOCATION_RULE_ID,
  LEGACY_SUBPATH_RELOCATION_RULE_ROUTE,
  type LegacySubpathRelocationReport,
} from "./report.ts";

export const legacySubpathRelocationSlice =
  defineRuleSlice<LegacySubpathRelocationReport>({
    id: LEGACY_SUBPATH_RELOCATION_RULE_ID,
    route: LEGACY_SUBPATH_RELOCATION_RULE_ROUTE,
    title: "Legacy subpath relocations",
    domain: "Imports",
    kind: "transformation",
    Summary: (props) => <p>{props.report.findings.length} safe import-path edits proposed</p>,
    Detail: (props) => (
      <>
        <p>This analyzer run only proposes these edits; it never applies them.</p>
        <RuleFindings findings={props.report.findings.map((finding) => ({
          filename: finding.filename,
          location: `${finding.filename}:${finding.line}:${finding.column}`,
          label: <><code>{finding.sourceModule}</code> → <code>{finding.replacementModule}</code> ({finding.form})</>,
          snippet: finding.snippet.text,
          guidance: finding.guidance,
        }))} />
      </>
    ),
  });
