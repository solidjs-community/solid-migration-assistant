import type { Edit } from "codemod:ast-grep";

/**
 * The shape every transform rule under rules/transformations/ returns. The
 * workflow adapter commits the edits and forwards the reports as structured
 * output; this module intentionally holds no rule logic.
 */

/** One rule-owned edit plus the report line that documents it. */
export type TransformChange = {
  edit: Edit;
  report: string;
};
