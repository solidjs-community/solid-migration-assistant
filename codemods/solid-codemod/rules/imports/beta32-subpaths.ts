import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { siteGuidance, stringLiteralValue } from "../../shared/analysis.ts";

const BETA32_SUBPATH_REPLACEMENTS: Readonly<Record<string, string>> = {
  "solid-js/store": "solid-js",
  "solid-js/h": "@solidjs/h",
  "solid-js/html": "@solidjs/html",
  "solid-js/universal": "@solidjs/universal",
  "solid-js/jsx-runtime": "@solidjs/web/jsx-runtime",
  "solid-js/jsx-dev-runtime": "@solidjs/web/jsx-dev-runtime",
};
const RULE_ID = "S2-IMPORT-BETA32-001";

type Beta32SubpathImport = {
  source: SgNode<TSX>;
  legacyModule: string;
  replacementModule: string;
};

export function analyzeBeta32SubpathImports(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findBeta32SubpathImports(rootNode).map(
    ({ source, legacyModule, replacementModule }) =>
      siteGuidance(
        source,
        context.filename,
        RULE_ID,
        "Move this Solid 2 beta.32 subpath import.",
        `Solid 2 beta.32 publishes ${legacyModule} from ${replacementModule}.`,
        `Change only this static import's module source from ${legacyModule} to ${replacementModule}, preserve its import form and quote style, and then run the application's typecheck and build. This analyzer does not edit source. Re-exports, dynamic imports, require calls, and TypeScript import types are deliberately outside this rule.`,
      ),
  );
}

function findBeta32SubpathImports(
  rootNode: SgNode<TSX>,
): Beta32SubpathImport[] {
  const matches: Beta32SubpathImport[] = [];

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source) continue;

    const legacyModule = stringLiteralValue(source);
    if (legacyModule === null) continue;
    const replacementModule = BETA32_SUBPATH_REPLACEMENTS[legacyModule];
    if (replacementModule === undefined) continue;

    matches.push({ source, legacyModule, replacementModule });
  }

  return matches;
}
