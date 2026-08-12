import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeWebImport } from "./web-import.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now";

const testWebImportRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeWebImport(root.root(), { filename });
  const locations = ["1:24", "2:8", "3:41", "5:41", "6:38", "7:42", "8:44", "9:37"];
  const expected = locations.map(
    (location) => `${filename}:${location} Move this Solid web renderer import.
Why: Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.
Guidance: Change only this static import's module source to @solidjs/web and preserve its import form and quote style. Make and validate that edit yourself; this analyzer never edits or runs the target project. This rule proves only static import statements. Re-exports, dynamic imports, require calls, and TypeScript import() type expressions are outside this finding. Official migration guide: ${MIGRATION_GUIDE}`,
  );

  if (guidance.join("\n---finding---\n") !== expected.join("\n---finding---\n")) {
    throw new Error(`unexpected web-import guidance:\n${guidance.join("\n---finding---\n")}`);
  }
  if (guidance.some((entry) => entry.includes("[S2-IMPORT-WEB-001]"))) {
    throw new Error("web-import guidance must not expose a rule ID");
  }

  const source = root.source();
  for (const nearestNegative of [
    'export { hydrate } from "solid-js/web"',
    'import("solid-js/web")',
    'require("solid-js/web")',
    'import("solid-js/web").JSX',
    'solid-js\\x2fweb',
    'from "@solidjs/web"',
    'from "solid-js/web-extra"',
    'from "vendor/solid-js/web"',
    'from "solid-js/web/"',
  ]) {
    if (!source.includes(nearestNegative)) {
      throw new Error(`missing nearest-negative fixture: ${nearestNegative}`);
    }
  }

  return null;
};

export default testWebImportRule;
