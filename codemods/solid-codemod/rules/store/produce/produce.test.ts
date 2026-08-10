import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeProduce } from "./produce.ts";

const testProduceRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeProduce(root.root(), { filename });
  const locations = root.source().includes('from "solid-js/store"')
    ? ["8:1", "13:3", "20:1", "23:1", "24:23"]
    : [];

  assertGuidance(guidance, filename, locations, "S2-STORE-PRODUCE-001", [
    "produce wrapper",
    "draft-first",
    "setter",
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

export default testProduceRule;
