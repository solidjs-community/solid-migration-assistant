import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeMergeProps } from "./merge-props.ts";

const testMergePropsRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeMergeProps(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["10:1", "11:1", "13:1", "15:1"]
    : [];

  assertGuidance(guidance, filename, locations, [
    "[S2-PROPS-001]",
    "merge",
    "undefined",
    "identity",
    "function sources",
    "props/store proxies",
    "Stop without proposing a rename",
  ]);
  if (guidance.length > 0) {
    const sourceCounts = guidance.map(
      (entry) => /This call has (\d+) source argument/.exec(entry)?.[1],
    );
    if (sourceCounts.join(",") !== "2,2,1,2") {
      throw new Error(
        `unexpected mergeProps source counts: ${sourceCounts.join(",")}`,
      );
    }
    if (
      !guidance[2]?.includes("spread syntax") ||
      guidance.some(
        (entry, index) => index !== 2 && entry.includes("spread syntax"),
      )
    ) {
      throw new Error(
        "mergeProps spread guidance must appear only for the spread call",
      );
    }
  }
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
      `expected ${locations.length} mergeProps guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected mergeProps locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete mergeProps guidance: ${entry}`);
    }
  }
}

export default testMergePropsRule;
