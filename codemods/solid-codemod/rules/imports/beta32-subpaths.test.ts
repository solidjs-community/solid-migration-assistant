import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeBeta32SubpathImports } from "./beta32-subpaths.ts";

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
    location: "10:36",
    legacy: "solid-js/html",
    replacement: "@solidjs/html",
  },
  {
    location: "11:50",
    legacy: "solid-js/universal",
    replacement: "@solidjs/universal",
  },
] as const;

const testBeta32SubpathRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeBeta32SubpathImports(root.root(), { filename });

  if (guidance.length !== EXPECTED_SITES.length) {
    throw new Error(
      `expected ${EXPECTED_SITES.length} beta.32 subpath guidance entries, got ${guidance.length}`,
    );
  }

  guidance.forEach((entry, index) => {
    const expected = EXPECTED_SITES[index]!;
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    const location = match ? `${match[2]}:${match[3]}` : "invalid";
    const requiredText = [
      `[S2-IMPORT-BETA32-001]`,
      "Solid 2 beta.32",
      `from ${expected.legacy} to ${expected.replacement}`,
      "static import",
      "does not edit source",
      "Re-exports, dynamic imports, require calls, and TypeScript import types",
    ];

    if (
      location !== expected.location ||
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`unexpected beta.32 subpath guidance: ${entry}`);
    }
  });

  return null;
};

export default testBeta32SubpathRule;
