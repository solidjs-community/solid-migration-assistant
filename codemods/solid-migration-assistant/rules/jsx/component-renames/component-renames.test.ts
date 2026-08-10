import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeJsxComponentRenames } from "./component-renames.ts";

const testJsxComponentRenames: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeJsxComponentRenames(root.root(), { filename });
  const expected = [
    ["18:7", "Suspense", "Loading"],
    ["20:9", "ErrorBoundary", "Errored"],
    ["25:7", "Suspense", "Loading"],
    ["27:7", "SuspenseList", "Reveal"],
    ["28:9", "Suspense", "Loading"],
    ["33:7", "Index", "For"],
  ] as const;

  if (guidance.length !== expected.length) {
    throw new Error(
      `expected ${expected.length} JSX component guidance entries, got ${guidance.length}`,
    );
  }

  guidance.forEach((entry, index) => {
    const [location, legacyName, replacementName] = expected[index]!;
    const required = [
      `${filename}:${location} [S2-JSX-COMPONENT-001]`,
      legacyName,
      replacementName,
      "Why:",
      "Guidance:",
      "This analyzer does not edit source",
      "Stop",
    ];
    if (required.some((text) => !entry.includes(text))) {
      throw new Error(`incomplete JSX component guidance: ${entry}`);
    }
  });

  const reveal = guidance[3]!;
  if (
    !reveal.includes("revealOrder") ||
    !reveal.includes("order") ||
    !reveal.includes("tail") ||
    !reveal.includes("collapsed")
  ) {
    throw new Error(`incomplete SuspenseList guidance: ${reveal}`);
  }
  const index = guidance[5]!;
  if (!index.includes("keyed={false}") || !index.includes("callback shape")) {
    throw new Error(`incomplete Index guidance: ${index}`);
  }

  return null;
};

export default testJsxComponentRenames;
