import type { Edit } from "codemod:ast-grep";

/**
 * Workflow-level report state key for the transform workflow. Transform
 * rules live under rules/transformations/ and report through this shared
 * key; this module intentionally holds no rule logic.
 */
export const TRANSFORM_REPORT_STATE_KEY =
  "solid-migration-assistant-transform-report";

/** One rule-owned edit plus the report line that documents it. */
export type TransformChange = {
  edit: Edit;
  report: string;
};
