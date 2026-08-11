import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeBeta32SubpathImports } from "./beta32-subpaths.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now";
const STORE_STOP_CONDITION =
  "Stop: do not blindly rewrite this source if the import includes removed or renamed beta.32 helpers such as unwrap, produce, createMutable, or modifyMutable. Migrate those bindings and call sites first, then move supported store imports to solid-js.";
const EXPECTED_SITES = [
  { location: "1:29", legacy: "solid-js/store", replacement: "solid-js" },
  { location: "2:15", legacy: "solid-js/h", replacement: "@solidjs/h" },
  { location: "3:18", legacy: "solid-js/html", replacement: "@solidjs/html" },
  {
    location: "4:32",
    legacy: "solid-js/universal",
    replacement: "@solidjs/universal",
  },
  {
    location: "5:21",
    legacy: "solid-js/jsx-runtime",
    replacement: "@solidjs/web/jsx-runtime",
  },
  {
    location: "6:24",
    legacy: "solid-js/jsx-dev-runtime",
    replacement: "@solidjs/web/jsx-dev-runtime",
  },
  { location: "8:28", legacy: "solid-js/store", replacement: "solid-js" },
  { location: "9:35", legacy: "solid-js/h", replacement: "@solidjs/h" },
  {
    location: "11:39",
    legacy: "solid-js/html",
    replacement: "@solidjs/html",
  },
  {
    location: "12:36",
    legacy: "solid-js/html",
    replacement: "@solidjs/html",
  },
  {
    location: "13:50",
    legacy: "solid-js/universal",
    replacement: "@solidjs/universal",
  },
  {
    location: "14:41",
    legacy: "solid-js/jsx-runtime",
    replacement: "@solidjs/web/jsx-runtime",
  },
  {
    location: "15:37",
    legacy: "solid-js/jsx-dev-runtime",
    replacement: "@solidjs/web/jsx-dev-runtime",
  },
] as const;

const testBeta32SubpathRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeBeta32SubpathImports(root.root(), { filename });
  const expected = EXPECTED_SITES.map(
    ({ location, legacy, replacement }) => `${filename}:${location} Move this Solid 2 beta.32 subpath import.
Why: Solid 2 beta.32 publishes ${legacy} from ${replacement}.
Guidance: Change only this static import's module source from ${legacy} to ${replacement} and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding.${legacy === "solid-js/store" ? ` ${STORE_STOP_CONDITION}` : ""} Official migration guide: ${MIGRATION_GUIDE}`,
  );

  if (guidance.join("\n---finding---\n") !== expected.join("\n---finding---\n")) {
    throw new Error(
      `unexpected beta.32 subpath guidance:\n${guidance.join("\n---finding---\n")}`,
    );
  }
  if (guidance.some((entry) => !entry.includes(MIGRATION_GUIDE))) {
    throw new Error("every beta.32 subpath finding must link the migration guide");
  }
  if (guidance.some((entry) => entry.includes("[S2-IMPORT-BETA32-001]"))) {
    throw new Error("beta.32 subpath guidance must not expose the old rule ID");
  }
  guidance.forEach((entry, index) => {
    const isStoreImport = EXPECTED_SITES[index]!.legacy === "solid-js/store";
    if (entry.includes(STORE_STOP_CONDITION) !== isStoreImport) {
      throw new Error(`unexpected store stop condition: ${entry}`);
    }
  });

  const source = root.source();
  for (const nearestNegative of [
    'export { createStore as reexportedStore } from "solid-js/store"',
    'export * from "solid-js/h"',
    'import("solid-js/html")',
    'require("solid-js/universal")',
    'import("solid-js/jsx-runtime").JSX',
    'from "solid-js"',
    'from "@solidjs/h"',
    'from "@solidjs/html"',
    'from "@solidjs/universal"',
    'from "@solidjs/web/jsx-runtime"',
    'from "@solidjs/web/jsx-dev-runtime"',
    'from "solid-js/web"',
    'from "solid-js/store-extra"',
    'from "vendor/solid-js/store"',
    'from "solid-js/store/"',
    'solid-js\\\\x2fstore',
  ]) {
    if (!source.includes(nearestNegative)) {
      throw new Error(`missing nearest-negative fixture: ${nearestNegative}`);
    }
  }

  return null;
};

export default testBeta32SubpathRule;
