import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { siteGuidance, stringLiteralValue } from "../../shared/analysis.ts";

const LEGACY_WEB_MODULE = "solid-js/web";
const RULE_ID = "S2-IMPORT-WEB-001";

export function analyzeWebImport(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findStaticWebImports(rootNode).map((source) =>
    siteGuidance(
      source,
      context.filename,
      RULE_ID,
      "Move this Solid web renderer import.",
      "Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.",
      "Change only this static import's module source to @solidjs/web, preserve its import form and quote style, and then run the application's typecheck and build. This analyzer does not edit source. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are deliberately outside this rule.",
    ),
  );
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
