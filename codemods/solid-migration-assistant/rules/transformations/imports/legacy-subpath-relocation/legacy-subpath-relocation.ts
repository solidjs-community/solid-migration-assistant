import type { Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findModuleReferences, sourceSnippet } from "../../../../shared/analysis.ts";
import type { LegacySubpathRelocationFinding, LegacySubpathRelocationReport } from "./report.ts";

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

export type LegacySubpathRelocationResult = {
  readonly edits: Edit[];
  readonly report: LegacySubpathRelocationReport;
};

/**
 * Looks up a relocation target using an own-property check. A plain
 * `LEGACY_SUBPATH_RELOCATIONS[moduleName]` read would traverse the object's
 * prototype chain, so bare specifiers such as "constructor", "toString", or
 * "__proto__" would resolve to inherited members and be rewritten into
 * garbage. Those specifiers are ordinary module names and must stay intact.
 */
function relocationTarget(moduleName: string): string | undefined {
  if (!Object.hasOwn(LEGACY_SUBPATH_RELOCATIONS, moduleName)) return undefined;
  return LEGACY_SUBPATH_RELOCATIONS[moduleName];
}

/**
 * Only the string that follows the `from` keyword is a re-export's module
 * source. `export default "solid-js/h"` also places a string directly under
 * `export_statement`, but that string is the exported value, not a module
 * reference, so it must never be rewritten.
 */
function isReExportSource(source: SgNode<TSX>): boolean {
  const statement = source.parent();
  if (!statement || statement.kind() !== "export_statement") return false;
  return statement.children().some((child) => child.kind() === "from");
}

/**
 * Kinds of syntax nodes that can directly hold a `require` binding. For the
 * position-sensitive kinds, `isShadowBinding` narrows the match to the actual
 * binding slot so adjacent references never count.
 */
const REQUIRE_BINDING_PARENT_KINDS = new Set([
  "function_declaration",
  "class_declaration",
  "variable_declarator",
  "required_parameter",
  "optional_parameter",
  "rest_pattern",
  "array_pattern",
  "object_pattern",
  "pair_pattern",
  "import_clause",
  "namespace_import",
  "import_specifier",
  "catch_clause",
  "assignment_pattern",
  "object_assignment_pattern",
]);

function samePosition(left: SgNode<TSX>, right: SgNode<TSX>): boolean {
  const a = left.range().start;
  const b = right.range().start;
  return a.line === b.line && a.column === b.column;
}

/**
 * True when the identifier occupies the binding slot of its parent node and
 * not merely a reference next to it. This keeps the scan precise in both
 * directions: `import { require as r }`, `function f(a = require)`, and
 * `const alias = require` are references (the local binding is `r`, `a`, and
 * `alias`), while `const [require] = arr`, `const { require = 1 } = obj`, and
 * `function g(require = 1)` all bind `require` and must suppress relocation
 * of bare `require(...)` calls.
 */
function isShadowBinding(node: SgNode<TSX>): boolean {
  const parent = node.parent();
  if (!parent || !REQUIRE_BINDING_PARENT_KINDS.has(parent.kind())) {
    return false;
  }
  switch (parent.kind()) {
    case "import_specifier": {
      const alias = parent.field("alias");
      return (
        alias === null ||
        alias.text() === "require" ||
        samePosition(alias, node)
      );
    }
    case "required_parameter":
    case "optional_parameter": {
      const pattern = parent.field("pattern");
      return pattern !== null && samePosition(pattern, node);
    }
    case "assignment_pattern":
    case "object_assignment_pattern": {
      const left = parent.field("left");
      return left !== null && samePosition(left, node);
    }
    case "pair_pattern": {
      const value = parent.field("value");
      return value !== null && samePosition(value, node);
    }
    case "function_declaration":
    case "class_declaration":
    case "variable_declarator": {
      const name = parent.field("name");
      return name !== null && samePosition(name, node);
    }
    default:
      return true;
  }
}

/**
 * Bare `require(...)` calls are module references only when `require` is the
 * ambient CommonJS require. The transform workflow has no semantic provider,
 * so shadowing is detected syntactically: if the file declares its own
 * `require` binding anywhere (function/class declaration, variable,
 * destructuring pattern, parameter, import, catch parameter), every bare
 * `require(...)` call in that file is conservatively left untouched.
 * `declare const require` and `declare function require` describe the global
 * require and are exempted. Binding slots are matched position-precisely, so
 * `import { require as r }`, `function f(a = require)`, and
 * `const alias = require` never count as shadows.
 */
function hasShadowingRequireBinding(rootNode: SgNode<TSX>): boolean {
  const kinds = [
    "identifier",
    "type_identifier",
    "shorthand_property_identifier_pattern",
  ] as const;
  for (const kind of kinds) {
    for (const node of rootNode.findAll({
      rule: { kind, regex: "^require$" },
    })) {
      if (
        node.ancestors().some(
          (ancestor) => ancestor.kind() === "ambient_declaration",
        )
      ) {
        continue;
      }
      if (isShadowBinding(node)) return true;
    }
  }
  return false;
}

/**
 * Maps every legacy Solid subpath module reference in `rootNode` to a
 * deterministic edit plus a human-readable per-edit report. The caller
 * commits the edits and persists the reports; this rule performs no I/O.
 */
export function relocateLegacySubpaths(
  rootNode: SgNode<TSX>,
  filename: string,
): LegacySubpathRelocationResult {
  const shadowedRequire = hasShadowingRequireBinding(rootNode);
  const relocations = findModuleReferences(rootNode)
    .map(({ source, moduleName, form }) => {
      const replacement = relocationTarget(moduleName);
      if (replacement === undefined) return null;
      if (form === "re-export" && !isReExportSource(source)) return null;
      if (form === "require" && shadowedRequire) return null;
      const start = source.range().start;
      const quote = source.text()[0];
      const guidance = `${filename}:${start.line + 1}:${start.column + 1} Relocate ${moduleName} to ${replacement}. Official migration guide: ${TRANSFORM_MIGRATION_GUIDE}`;
      const finding: LegacySubpathRelocationFinding = {
        filename,
        line: start.line + 1,
        column: start.column + 1,
        form,
        sourceModule: moduleName,
        replacementModule: replacement,
        guidance,
        snippet: sourceSnippet(source),
      };
      return { edit: source.replace(`${quote}${replacement}${quote}`), finding };
    })
    .filter(
      (entry): entry is { edit: Edit; finding: LegacySubpathRelocationFinding } => entry !== null,
    );
  return {
    edits: relocations.map(({ edit }) => edit),
    report: { findings: relocations.map(({ finding }) => finding) },
  };
}
