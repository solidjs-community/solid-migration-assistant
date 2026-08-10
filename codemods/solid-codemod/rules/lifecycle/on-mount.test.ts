import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeOnMount } from "./on-mount.ts";

const testOnMountRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeOnMount(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["9:1", "14:1", "18:1", "24:1", "29:1", "30:1", "32:1"]
    : [];

  assertGuidance(guidance, filename, locations, [
    "[S2-LIFECYCLE-001]",
    "onSettled",
    "ownership",
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
      `expected ${locations.length} onMount guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected onMount locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete onMount guidance: ${entry}`);
    }
  }
}

export default testOnMountRule;
