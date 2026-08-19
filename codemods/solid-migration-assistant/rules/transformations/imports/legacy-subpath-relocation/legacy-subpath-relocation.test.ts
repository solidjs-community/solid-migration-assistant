import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  relocateLegacySubpaths,
  TRANSFORM_MIGRATION_GUIDE,
} from "./legacy-subpath-relocation.ts";
import { formatLegacySubpathRelocationGuidance } from "./report.ts";

type FixtureCase = {
  relocations: ReadonlyArray<{
    location: string;
    from: string;
    to: string;
  }>;
  /** Exact post-transform file text, or null when the file must stay unchanged. */
  transformed: string | null;
};

const FIXTURE_CASES: Record<string, FixtureCase> = {
  "relocations": {
    relocations: [
      { location: "2:15", from: "solid-js/h", to: "@solidjs/h" },
      { location: "3:18", from: "solid-js/html", to: "@solidjs/html" },
      { location: "4:32", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "5:21", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "6:24", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
      { location: "8:36", from: "solid-js/html", to: "@solidjs/html" },
      { location: "10:50", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "11:36", from: "solid-js/html", to: "@solidjs/html" },
      { location: "12:50", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "13:41", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "14:37", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
      { location: "17:34", from: "solid-js/h", to: "@solidjs/h" },
      { location: "18:15", from: "solid-js/html", to: "@solidjs/html" },
      { location: "20:28", from: "solid-js/html", to: "@solidjs/html" },
      { location: "22:35", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "23:28", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
    ],
    transformed: "// fixture: relocations\nimport h from \"@solidjs/h\";\nimport html from \"@solidjs/html\";\nimport { createRenderer } from \"@solidjs/universal\";\nimport { jsx } from \"@solidjs/web/jsx-runtime\";\nimport { jsxDEV } from \"@solidjs/web/jsx-dev-runtime\";\n// prettier-ignore\nimport { html as singleHtml } from '@solidjs/html';\n// prettier-ignore\nimport { createRenderer as singleRenderer } from '@solidjs/universal';\nimport { html as escapedHex } from \"@solidjs/html\";\nimport { createRenderer as escapedUnicode } from \"@solidjs/universal\";\nimport { jsx as escapedCodePoint } from \"@solidjs/web/jsx-runtime\";\nimport { jsxDEV as continued } from \"@solidjs/web/jsx-dev-runtime\";\n\nexport { h as reexportedH } from \"@solidjs/h\";\nexport * from \"@solidjs/html\";\n\nconst dynamicHtml = import(\"@solidjs/html\");\ndeclare const require: (name: string) => unknown;\nconst commonJsUniversal = require(\"@solidjs/universal\");\ntype RuntimeTypes = import(\"@solidjs/web/jsx-runtime\").JSX;\n\n// Out-of-scope and already-migrated references that must remain byte-identical.\nimport { createStore as storeIsOutOfScope } from \"solid-js/store\";\nimport { render as webIsOutOfScope } from \"solid-js/web\";\nimport migratedH from \"@solidjs/h\";\nimport migratedHtml from \"@solidjs/html\";\nimport { createRenderer as migratedUniversal } from \"@solidjs/universal\";\nimport { jsx as migratedRuntime } from \"@solidjs/web/jsx-runtime\";\nimport { jsxDEV as migratedDevRuntime } from \"@solidjs/web/jsx-dev-runtime\";\nimport { nearH as prefixNearMiss } from \"solid-js/h-extra\";\nimport { nearH as suffixNearMiss } from \"vendor/solid-js/h\";\nimport { nearH as trailingSlashNearMiss } from \"solid-js/h/\";\nimport { nearStore as escapedNearMiss } from \"solid-js\\\\x2fstore\";\n\nvoid h;\nvoid html;\nvoid createRenderer;\nvoid jsx;\nvoid jsxDEV;\nvoid singleHtml;\nvoid singleRenderer;\nvoid escapedHex;\nvoid escapedUnicode;\nvoid escapedCodePoint;\nvoid continued;\nvoid reexportedH;\nvoid dynamicHtml;\nvoid commonJsUniversal;\nvoid storeIsOutOfScope;\nvoid webIsOutOfScope;\nvoid migratedH;\nvoid migratedHtml;\nvoid migratedUniversal;\nvoid migratedRuntime;\nvoid migratedDevRuntime;\nvoid prefixNearMiss;\nvoid suffixNearMiss;\nvoid trailingSlashNearMiss;\nvoid escapedNearMiss;\ntype _RuntimeTypes = RuntimeTypes;\n",
  },
  "static-imports": {
    relocations: [
      { location: "2:15", from: "solid-js/h", to: "@solidjs/h" },
      { location: "3:30", from: "solid-js/html", to: "@solidjs/html" },
      { location: "4:44", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "5:27", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "6:31", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
      { location: "7:29", from: "solid-js/h", to: "@solidjs/h" },
      { location: "8:8", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
    ],
    transformed: "// fixture: static-imports\nimport h from \"@solidjs/h\";\nimport html, { render } from \"@solidjs/html\";\nimport { createRenderer as renderer } from \"@solidjs/universal\";\nimport { jsx, jsxs } from \"@solidjs/web/jsx-runtime\";\nimport { jsxDEV as dev } from \"@solidjs/web/jsx-dev-runtime\";\nimport * as hNamespace from \"@solidjs/h\";\nimport \"@solidjs/web/jsx-runtime\";\n\nvoid h;\nvoid html;\nvoid render;\nvoid renderer;\nvoid jsx;\nvoid jsxs;\nvoid dev;\nvoid hNamespace;\n",
  },
  "single-quotes": {
    relocations: [
      { location: "2:15", from: "solid-js/h", to: "@solidjs/h" },
      { location: "3:24", from: "solid-js/html", to: "@solidjs/html" },
      { location: "4:32", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "5:21", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "6:24", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
      { location: "7:32", from: "solid-js/h", to: "@solidjs/h" },
      { location: "8:15", from: "solid-js/html", to: "@solidjs/html" },
      { location: "9:28", from: "solid-js/html", to: "@solidjs/html" },
      { location: "11:35", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "12:28", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
    ],
    transformed: "// fixture: single-quotes\nimport h from '@solidjs/h';\nimport { render } from '@solidjs/html';\nimport { createRenderer } from '@solidjs/universal';\nimport { jsx } from '@solidjs/web/jsx-runtime';\nimport { jsxDEV } from '@solidjs/web/jsx-dev-runtime';\nexport { h as exportedH } from '@solidjs/h';\nexport * from '@solidjs/html';\nconst dynamicHtml = import('@solidjs/html');\ndeclare const require: (name: string) => unknown;\nconst commonJsUniversal = require('@solidjs/universal');\ntype RuntimeTypes = import('@solidjs/web/jsx-runtime').JSX;\n\nvoid h;\nvoid render;\nvoid createRenderer;\nvoid jsx;\nvoid jsxDEV;\nvoid exportedH;\nvoid dynamicHtml;\nvoid commonJsUniversal;\ntype _RuntimeTypes = RuntimeTypes;\n",
  },
  "re-exports": {
    relocations: [
      { location: "2:19", from: "solid-js/h", to: "@solidjs/h" },
      { location: "3:15", from: "solid-js/html", to: "@solidjs/html" },
      { location: "4:40", from: "solid-js/html", to: "@solidjs/html" },
      { location: "5:74", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "6:26", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "7:24", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
    ],
    transformed: "// fixture: re-exports\nexport { h } from \"@solidjs/h\";\nexport * from \"@solidjs/html\";\nexport { default as htmlDefault } from \"@solidjs/html\";\nexport { createRenderer as renderer, createUniversal as universal } from \"@solidjs/universal\";\nexport type { JSX } from \"@solidjs/web/jsx-runtime\";\nexport { jsxDEV } from \"@solidjs/web/jsx-dev-runtime\";\n",
  },
  "runtime-forms": {
    relocations: [
      { location: "2:25", from: "solid-js/h", to: "@solidjs/h" },
      { location: "5:36", from: "solid-js/html", to: "@solidjs/html" },
      { location: "10:35", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "11:28", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "12:31", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
    ],
    transformed: "// fixture: runtime-forms\nconst dynamicH = import(\"@solidjs/h\");\n\nasync function load() {\n  const dynamicHtml = await import(\"@solidjs/html\");\n  return dynamicHtml;\n}\n\ndeclare const require: (name: string) => unknown;\nconst requiredUniversal = require(\"@solidjs/universal\");\ntype RuntimeTypes = import(\"@solidjs/web/jsx-runtime\").JSX;\ntype DevTypes = typeof import(\"@solidjs/web/jsx-dev-runtime\");\n\nimport { require as aliasRequire } from \"./helper\";\nfunction usesDefault(a = require) {\n  return a;\n}\nconst { a = require } = { a: null };\nconst localAlias = require;\n\nvoid dynamicH;\nvoid load;\nvoid requiredUniversal;\nvoid aliasRequire;\nvoid usesDefault;\nvoid localAlias;\ntype _RuntimeTypes = RuntimeTypes;\ntype _DevTypes = DevTypes;\n",
  },
  "negative-forms": {
    relocations: [],
    transformed: null,
  },
  "shadowed-require": {
    relocations: [],
    transformed: null,
  },
  "destructured-require": {
    relocations: [],
    transformed: null,
  },
  "prototype-names": {
    relocations: [
      { location: "7:15", from: "solid-js/h", to: "@solidjs/h" },
    ],
    transformed: "// fixture: prototype-names\nimport constructorModule from \"constructor\";\nimport toStringModule from \"toString\";\nimport hasOwnPropertyModule from \"hasOwnProperty\";\nimport valueOfModule from \"valueOf\";\nimport protoModule from \"__proto__\";\nimport h from \"@solidjs/h\";\n\nvoid constructorModule;\nvoid toStringModule;\nvoid hasOwnPropertyModule;\nvoid valueOfModule;\nvoid protoModule;\nvoid h;\n",
  },
  "escaped-specifiers": {
    relocations: [
      { location: "2:36", from: "solid-js/html", to: "@solidjs/html" },
      { location: "3:50", from: "solid-js/universal", to: "@solidjs/universal" },
      { location: "4:41", from: "solid-js/jsx-runtime", to: "@solidjs/web/jsx-runtime" },
      { location: "5:37", from: "solid-js/jsx-dev-runtime", to: "@solidjs/web/jsx-dev-runtime" },
    ],
    transformed: "// fixture: escaped-specifiers\nimport { html as escapedHex } from \"@solidjs/html\";\nimport { createRenderer as escapedUnicode } from \"@solidjs/universal\";\nimport { jsx as escapedCodePoint } from \"@solidjs/web/jsx-runtime\";\nimport { jsxDEV as continued } from \"@solidjs/web/jsx-dev-runtime\";\nimport { nearStore as escapedNearMiss } from \"solid-js\\\\x2fstore\";\n\nvoid escapedHex;\nvoid escapedUnicode;\nvoid escapedCodePoint;\nvoid continued;\nvoid escapedNearMiss;\n",
  },
  "no-matches": {
    relocations: [],
    transformed: null,
  },
};

const testLegacySubpathRelocation: Codemod<TSX> = async (root) => {
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

  const { edits, report } = relocateLegacySubpaths(rootNode, filename);

  const expected = fixtureCase.relocations
    .map(({ location, from, to }) =>
      `${filename}:${location} Relocate ${from} to ${to}. Official migration guide: ${TRANSFORM_MIGRATION_GUIDE}`,
    )
    .sort();

  if (report.findings.some((finding) => "guidance" in finding || !finding.summary || !finding.reason || finding.nextSteps.length === 0 || !finding.officialGuideUrl)) {
    throw new Error("relocation report must expose structured guidance fields only");
  }
  const actual = report.findings.map(formatLegacySubpathRelocationGuidance).sort();
  if (actual.join("\n") !== expected.join("\n")) {
    throw new Error(
      `unexpected relocation report for ${marker}:\n${actual.join("\n")}\nExpected:\n${expected.join("\n")}`,
    );
  }

  for (const finding of report.findings) {
    if (!finding.snippet.text.includes("solid-js")) throw new Error("relocation snippet must contain the matched module");
    if (finding.snippet.startLine !== Math.max(1, finding.line - 1)) {
      throw new Error(`snippet must start one complete line before ${finding.line}`);
    }
    if (finding.snippet.endLine < finding.line || finding.snippet.text.split("\n").length !== finding.snippet.endLine - finding.snippet.startLine + 1) {
      throw new Error(`snippet must include the full match and complete line bounds at ${finding.line}`);
    }
  }

  const transformed = rootNode.commitEdits(edits);
  const expectedTransformed = fixtureCase.transformed ?? source;
  if (transformed !== expectedTransformed) {
    throw new Error(
      `unexpected transformed output for ${marker}:\n${transformed}\nExpected:\n${expectedTransformed}`,
    );
  }

  return null;
};

export default testLegacySubpathRelocation;
