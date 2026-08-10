import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateMutable, analyzeModifyMutable } from "./mutable.ts";

const testMutableRules: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const hasSolidImport = root.source().includes('from "solid-js/store"');

  assertGuidance(
    analyzeCreateMutable(root.root(), { filename }),
    filename,
    hasSolidImport ? ["15:15", "17:20"] : [],
    "S2-STORE-CREATE-MUTABLE-001",
    ["createStore", "explicit setter", "call sites"],
  );
  assertGuidance(
    analyzeModifyMutable(root.root(), { filename }),
    filename,
    hasSolidImport ? ["18:1", "22:1"] : [],
    "S2-STORE-MODIFY-MUTABLE-001",
    ["createStore", "explicit setter", "mutation"],
  );
  return null;
};

function assertGuidance(
  guidance: string[],
  filename: string,
  locations: string[],
  ruleId: string,
  requiredText: string[],
): void {
  if (guidance.length !== locations.length) {
    throw new Error(
      `expected ${locations.length} ${ruleId} guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected ${ruleId} locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      !entry.includes(`[${ruleId}]`) ||
      !entry.includes("\nWhy:") ||
      !entry.includes("\nGuidance: Next step:") ||
      !entry.includes("Stop") ||
      !entry.includes("This analyzer does not edit code.") ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete ${ruleId} guidance: ${entry}`);
    }
  }
}

export default testMutableRules;
