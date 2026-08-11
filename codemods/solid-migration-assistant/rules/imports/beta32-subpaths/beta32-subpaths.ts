import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { stringLiteralValue } from "../../../shared/analysis.ts";

const BETA32_SUBPATH_REPLACEMENTS: Readonly<Record<string, string>> = {
  "solid-js/store": "solid-js",
  "solid-js/h": "@solidjs/h",
  "solid-js/html": "@solidjs/html",
  "solid-js/universal": "@solidjs/universal",
  "solid-js/jsx-runtime": "@solidjs/web/jsx-runtime",
  "solid-js/jsx-dev-runtime": "@solidjs/web/jsx-dev-runtime",
};
const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now";
const STORE_STOP_CONDITION =
  "Stop: do not blindly rewrite this source if the import includes removed or renamed beta.32 helpers such as unwrap, produce, createMutable, or modifyMutable. Migrate those bindings and call sites first, then move supported store imports to solid-js.";

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
    ({ source, legacyModule, replacementModule }) => {
      const start = source.range().start;
      return `${context.filename}:${start.line + 1}:${start.column + 1} Move this Solid 2 beta.32 subpath import.
Why: Solid 2 beta.32 publishes ${legacyModule} from ${replacementModule}.
Guidance: Change only this static import's module source from ${legacyModule} to ${replacementModule} and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding.${legacyModule === "solid-js/store" ? ` ${STORE_STOP_CONDITION}` : ""} Official migration guide: ${MIGRATION_GUIDE}`;
    },
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
