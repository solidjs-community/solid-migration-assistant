import type { Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findModuleReferences } from "../../../../shared/analysis.ts";

export const SOLID_SOURCE_COMMIT =
  "ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5";

export const TRANSFORM_MIGRATION_GUIDE = `https://github.com/solidjs/solid/blob/${SOLID_SOURCE_COMMIT}/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now`;

/**
 * The deterministic, semantics-preserving subset of the Solid 2 import-path
 * moves. Every entry is a pure package relocation: the module source changes
 * while imported bindings, import form, and quote style are preserved. No
 * entry here has a removed, renamed, or behaviorally changed export, so each
 * rewrite is safe without binding-level review.
 */
export const LEGACY_SUBPATH_RELOCATIONS: Readonly<Record<string, string>> = {
  "solid-js/h": "@solidjs/h",
  "solid-js/html": "@solidjs/html",
  "solid-js/universal": "@solidjs/universal",
  "solid-js/jsx-runtime": "@solidjs/web/jsx-runtime",
  "solid-js/jsx-dev-runtime": "@solidjs/web/jsx-dev-runtime",
};

export type SubpathRelocation = {
  edit: Edit;
  report: string;
};

/**
 * Maps every legacy Solid subpath module reference in `rootNode` to a
 * deterministic edit plus a human-readable per-edit report. The caller
 * commits the edits and persists the reports; this rule performs no I/O.
 */
export function relocateLegacySubpaths(
  rootNode: SgNode<TSX>,
  filename: string,
): SubpathRelocation[] {
  return findModuleReferences(rootNode)
    .map(({ source, moduleName }) => {
      const replacement = LEGACY_SUBPATH_RELOCATIONS[moduleName];
      if (replacement === undefined) return null;
      const start = source.range().start;
      const quote = source.text()[0];
      return {
        edit: source.replace(`${quote}${replacement}${quote}`),
        report: `${filename}:${start.line + 1}:${start.column + 1} Relocate ${moduleName} to ${replacement}. Official migration guide: ${TRANSFORM_MIGRATION_GUIDE}`,
      };
    })
    .filter(
      (entry): entry is SubpathRelocation => entry !== null,
    );
}
