import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateComputed } from "./create-computed.ts";

const testCreateComputedRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeCreateComputed(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["11:1", "12:1", "13:1", "14:1", "19:1", "20:1", "21:1"]
    : [];

  assertGuidance(guidance, filename, locations, [
    "[S2-COMPUTED-001]",
    "createMemo",
    "createEffect",
    "createSignal",
    "createStore",
    "Stop without proposing a rewrite",
  ]);
  if (guidance.length > 0) {
    const argumentCounts = guidance.map(
      (entry) => /This call has (\d+) semantic argument/.exec(entry)?.[1],
    );
    if (argumentCounts.join(",") !== "1,1,1,1,1,2,3") {
      throw new Error(
        `unexpected createComputed argument counts: ${argumentCounts.join(",")}`,
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
      `expected ${locations.length} createComputed guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected createComputed locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete createComputed guidance: ${entry}`);
    }
  }
}

export default testCreateComputedRule;
