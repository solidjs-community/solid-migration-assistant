import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeWebImport } from "./web-import.ts";

const testWebImportRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeWebImport(root.root(), { filename });

  assertGuidance(
    guidance,
    filename,
    ["1:24", "2:8", "3:41", "5:41", "6:38", "7:42", "8:44", "9:37"],
    [
      "[S2-IMPORT-WEB-001]",
      "@solidjs/web",
      "static import",
      "does not edit source",
      "Re-exports, dynamic imports, require calls, and TypeScript import() type expressions",
    ],
  );
  return null;
};

function assertGuidance(
  guidance: string[],
  filename: string,
  locations: string[],
  requiredText: string[],
): void {
  if (guidance.length !== locations.length) {
    throw new Error(
      `expected ${locations.length} web-import guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected web-import locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete web-import guidance: ${entry}`);
    }
  }
}

export default testWebImportRule;
