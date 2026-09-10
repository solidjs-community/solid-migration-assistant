import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  relocateWebPackage,
  WEB_MIGRATION_GUIDE,
} from "./web-package-relocation.ts";

type FixtureCase = {
  /** Every statement this rule may relocate, with the bindings that proved it. */
  relocations: ReadonlyArray<{
    location: string;
    bindings: string;
  }>;
  /** Exact post-transform file text, or null when the file must stay unchanged. */
  transformed: string | null;
};

const FIXTURE_CASES: Record<string, FixtureCase> = {
  "coexistence": {
    relocations: [
      { location: "2:24", bindings: "render" },
      { location: "7:25", bindings: "hydrate" },
    ],
    transformed: "// fixture: coexistence\nimport { render } from \"@solidjs/web\";\nimport h from \"solid-js/h\";\nimport html from \"solid-js/html\";\nimport { createRenderer } from \"solid-js/universal\";\nimport { jsx } from \"solid-js/jsx-runtime\";\nexport { hydrate } from \"@solidjs/web\";\nexport { jsxDEV } from \"solid-js/jsx-dev-runtime\";\nimport { Portal } from \"solid-js/web\";\nconst dynamicHtml = import(\"solid-js/html\");\n\nvoid render;\nvoid h;\nvoid html;\nvoid createRenderer;\nvoid jsx;\nvoid Portal;\nvoid dynamicHtml;\n",
  },
  "escaped-specifiers": {
    relocations: [
      { location: "2:38", bindings: "render" },
      { location: "3:43", bindings: "hydrate" },
      { location: "4:45", bindings: "Dynamic" },
      { location: "5:46", bindings: "isServer" },
    ],
    transformed: "// fixture: escaped-specifiers\nimport { render as escapedHex } from \"@solidjs/web\";\nimport { hydrate as escapedUnicode } from \"@solidjs/web\";\nimport { Dynamic as escapedCodePoint } from \"@solidjs/web\";\nexport { isServer as escapedContinued } from \"@solidjs/web\";\nimport { render as escapedBackslash } from \"solid-js\\\\x2fweb\";\nimport { Portal as escapedVeto } from \"solid-js\\x2fweb\";\n\nvoid escapedHex;\nvoid escapedUnicode;\nvoid escapedCodePoint;\nvoid escapedBackslash;\nvoid escapedVeto;\n",
  },
  "local-exports": {
    relocations: [],
    transformed: null,
  },
  "mixed-bindings": {
    relocations: [
      { location: "8:65", bindings: "render, Dynamic" },
      { location: "9:67", bindings: "hydrate, isServer" },
    ],
    transformed: "// fixture: mixed-bindings\nimport { render, Portal } from \"solid-js/web\";\nimport { Portal as PortalAliased, hydrate as hydrateAliased } from \"solid-js/web\";\nimport { isServer, isDev } from \"solid-js/web\";\nimport { type Dynamic as DynamicMixed, Suspense } from \"solid-js/web\";\nexport { Dynamic, createDynamic } from \"solid-js/web\";\nexport { render as renderOut, Portal as portalOut } from \"solid-js/web\";\nimport { render as provenAlone, Dynamic as provenDynamic } from \"@solidjs/web\";\nexport { hydrate as provenOut, isServer as provenServerOut } from \"@solidjs/web\";\n\nvoid render;\nvoid Portal;\nvoid PortalAliased;\nvoid hydrateAliased;\nvoid isServer;\nvoid isDev;\nvoid Suspense;\nvoid provenAlone;\nvoid provenDynamic;\ntype _DynamicMixed = DynamicMixed;\n",
  },
  "named-imports": {
    relocations: [
      { location: "2:24", bindings: "render" },
      { location: "3:46", bindings: "hydrate, render" },
      { location: "4:25", bindings: "Dynamic" },
      { location: "5:26", bindings: "isServer" },
      { location: "6:43", bindings: "render" },
      { location: "7:68", bindings: "Dynamic, hydrate" },
      { location: "11:8", bindings: "isServer, render" },
      { location: "12:64", bindings: "render" },
    ],
    transformed: "// fixture: named-imports\nimport { render } from \"@solidjs/web\";\nimport { hydrate, render as renderApp } from \"@solidjs/web\";\nimport { Dynamic } from '@solidjs/web';\nimport { isServer } from \"@solidjs/web\";\nimport type { render as RenderType } from \"@solidjs/web\";\nimport { type Dynamic as DynamicType, hydrate as hydrateApp } from \"@solidjs/web\";\nimport {\n  isServer as onServer,\n  render as renderIndented,\n} from \"@solidjs/web\";\nimport { render as duplicateOne, render as duplicateTwo } from \"@solidjs/web\";\n\nvoid render;\nvoid hydrate;\nvoid renderApp;\nvoid Dynamic;\nvoid isServer;\nvoid hydrateApp;\nvoid onServer;\nvoid renderIndented;\nvoid duplicateOne;\nvoid duplicateTwo;\ntype _RenderType = typeof RenderType;\ntype _DynamicType = DynamicType;\n",
  },
  "named-re-exports": {
    relocations: [
      { location: "2:24", bindings: "render" },
      { location: "3:39", bindings: "hydrate" },
      { location: "4:35", bindings: "Dynamic, isServer" },
      { location: "5:43", bindings: "render" },
      { location: "6:76", bindings: "isServer, Dynamic" },
      { location: "9:8", bindings: "hydrate" },
    ],
    transformed: "// fixture: named-re-exports\nexport { render } from \"@solidjs/web\";\nexport { hydrate as hydrateApp } from \"@solidjs/web\";\nexport { Dynamic, isServer } from '@solidjs/web';\nexport type { render as RenderType } from \"@solidjs/web\";\nexport { type isServer as IsServerType, Dynamic as DynamicComponent } from \"@solidjs/web\";\nexport {\n  hydrate,\n} from \"@solidjs/web\";\n",
  },
  "near-miss-modules": {
    relocations: [],
    transformed: null,
  },
  "no-matches": {
    relocations: [],
    transformed: null,
  },
  "non-named-forms": {
    relocations: [],
    transformed: null,
  },
  "runtime-forms": {
    relocations: [],
    transformed: null,
  },
  "unsupported-shapes": {
    relocations: [
      { location: "5:42", bindings: "render" },
    ],
    transformed: "// fixture: unsupported-shapes\nimport { render } from \"solid-js/web\" with { type: \"js\" };\nexport { render as attributedOut } from \"solid-js/web\" with { type: \"js\" };\nexport { \"render\" as stringNamedOut } from \"solid-js/web\";\nexport { render as stringAliasOut } from \"@solidjs/web\";\n\nvoid render;\n",
  },
  "vetoed-bindings": {
    relocations: [],
    transformed: null,
  },
};

const testWebPackageRelocation: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const source = root.source();
  const marker = /\/\/ fixture: ([a-z0-9-]+)/.exec(source)?.[1];
  if (!marker) {
    throw new Error(
      "fixture is missing a `// fixture: <name>` marker on its first line",
    );
  }

  const fixtureCase = FIXTURE_CASES[marker];
  if (!fixtureCase) {
    throw new Error(`unknown fixture marker: ${marker}`);
  }

  const relocations = relocateWebPackage(rootNode, filename);

  const expected = fixtureCase.relocations.map(
    ({ location, bindings }) =>
      `${filename}:${location} Relocate solid-js/web to @solidjs/web for proven bindings ${bindings}. Official migration guide: ${WEB_MIGRATION_GUIDE}`,
  );

  // Compared in emitted order, not sorted: the rule promises source order.
  const actual = relocations.map(({ report }) => report);
  if (actual.join("\n") !== expected.join("\n")) {
    throw new Error(
      `unexpected relocation report for ${marker}:\n${actual.join("\n")}\nExpected:\n${expected.join("\n")}`,
    );
  }

  const transformed = rootNode.commitEdits(relocations.map(({ edit }) => edit));
  const expectedTransformed = fixtureCase.transformed ?? source;
  if (transformed !== expectedTransformed) {
    throw new Error(
      `unexpected transformed output for ${marker}:\n${transformed}\nExpected:\n${expectedTransformed}`,
    );
  }

  // Idempotency at the rule level: every relocation writes one plain
  // `@solidjs/web` specifier, which this rule never matches again. Counting
  // the gain works even for escaped sources such as "solid-js\x2fweb", whose
  // pre-transform text does not contain the decoded module name at all.
  const gained =
    occurrences(transformed, "@solidjs/web") -
    occurrences(source, "@solidjs/web");
  if (gained !== relocations.length) {
    throw new Error(
      `expected ${relocations.length} new @solidjs/web specifiers in ${marker}, found ${gained}`,
    );
  }

  return null;
};

function occurrences(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

export default testWebPackageRelocation;
