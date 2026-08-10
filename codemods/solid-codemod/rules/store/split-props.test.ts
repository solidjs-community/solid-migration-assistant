import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeSplitProps } from "./split-props.ts";

const testSplitPropsRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeSplitProps(root.root(), { filename });
  const locations = root.source().includes('from "solid-js/store"')
    ? ["9:23", "10:16", "12:1"]
    : [];

  assertGuidance(guidance, filename, locations, "S2-STORE-SPLIT-PROPS-001", [
    "omit",
    "tuple",
    "call-site",
  ]);
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

export default testSplitPropsRule;
