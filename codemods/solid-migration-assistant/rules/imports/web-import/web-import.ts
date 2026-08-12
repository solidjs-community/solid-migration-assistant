import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { stringLiteralValue } from "../../../shared/analysis.ts";

const LEGACY_WEB_MODULE = "solid-js/web";
const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now";

export function analyzeWebImport(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findStaticWebImports(rootNode).map((source) => {
    const start = source.range().start;
    return `${context.filename}:${start.line + 1}:${start.column + 1} Move this Solid web renderer import.
Why: Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.
Guidance: Change only this static import's module source to @solidjs/web and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding. Official migration guide: ${MIGRATION_GUIDE}`;
  });
}

function findStaticWebImports(rootNode: SgNode<TSX>): SgNode<TSX>[] {
  const matches: SgNode<TSX>[] = [];

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== LEGACY_WEB_MODULE) continue;
    matches.push(source);
  }

  return matches;
}
