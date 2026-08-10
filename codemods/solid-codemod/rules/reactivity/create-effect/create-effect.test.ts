import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateEffect } from "./create-effect.ts";

const testCreateEffectRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeCreateEffect(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["6:1", "11:1", "16:1", "17:1", "19:1"]
    : [];
  assertGuidance(guidance, filename, locations, [
    "[S2-EFFECT-001]",
    "separate compute and effect callbacks",
    "reactive reads",
    "Stop without proposing a rewrite",
    "focused test or runtime observation",
  ]);
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
      `expected ${locations.length} createEffect guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected createEffect locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete createEffect guidance: ${entry}`);
    }
  }
}

export default testCreateEffectRule;
