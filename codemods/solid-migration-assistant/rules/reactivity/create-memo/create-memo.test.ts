import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateMemo } from "./create-memo.ts";

const testCreateMemoRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeCreateMemo(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["6:1", "7:1", "8:1", "9:1", "11:1"]
    : [];

  assertGuidance(guidance, filename, locations, [
    "[S2-MEMO-001]",
    "Manual review required",
    "initial value",
    "second argument for options",
    "Do not perform a positional rewrite",
    "focused test",
  ]);
  if (guidance.length > 0) {
    const optionFlags = guidance.map((entry) =>
      entry.includes("and its third argument as options"),
    );
    if (optionFlags.join(",") !== "false,true,false,false,true") {
      throw new Error(
        `unexpected createMemo legacy-options guidance: ${optionFlags.join(",")}`,
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
      `expected ${locations.length} createMemo guidance entries, got ${guidance.length}`,
    );
  }
  const actualLocations = guidance.map((entry) => {
    const match = /^(.*):(\d+):(\d+) \[/.exec(entry);
    return match ? `${match[2]}:${match[3]}` : "invalid";
  });
  if (actualLocations.join(",") !== locations.join(",")) {
    throw new Error(
      `unexpected createMemo locations: ${actualLocations.join(",")}`,
    );
  }
  for (const entry of guidance) {
    if (
      !entry.startsWith(`${filename}:`) ||
      requiredText.some((text) => !entry.includes(text))
    ) {
      throw new Error(`incomplete createMemo guidance: ${entry}`);
    }
  }
}

export default testCreateMemoRule;
