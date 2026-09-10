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

/**
 * Merges the changes of every transform rule for one file into a single
 * deterministic edit list.
 *
 * Each rule scans the same tree independently, so the merged list is sorted by
 * source position to keep the committed edits and their reports independent of
 * rule order. Two rules editing overlapping ranges would make the result depend
 * on which edit wins, so an overlap fails loudly instead.
 *
 * The three rules composed today own disjoint syntax, so the guard should never
 * fire: legacy-subpath-relocation and web-package-relocation both rewrite module
 * source strings but match disjoint specifier sets (the five pure subpaths
 * versus `solid-js/web`), and class-list-to-class rewrites JSX attribute name
 * nodes, which no import or export statement contains. That disjointness is a
 * property of the current rules rather than of the composition, so it is checked
 * here instead of assumed on their behalf.
 */
export function composeTransformChanges(
  ruleChanges: ReadonlyArray<readonly TransformChange[]>,
): TransformChange[] {
  const changes = ruleChanges
    .flat()
    .sort(
      (left, right) =>
        left.edit.startPos - right.edit.startPos ||
        left.edit.endPos - right.edit.endPos,
    );

  let previous: TransformChange | undefined;
  for (const change of changes) {
    if (previous !== undefined && change.edit.startPos < previous.edit.endPos) {
      throw new Error(
        `overlapping transform edits at ${previous.edit.startPos}-${previous.edit.endPos} and ${change.edit.startPos}-${change.edit.endPos}`,
      );
    }
    previous = change;
  }

  return changes;
}
