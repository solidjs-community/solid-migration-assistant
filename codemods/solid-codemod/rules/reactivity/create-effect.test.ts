import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateEffect } from "./create-effect.ts";

const testCreateEffectRule: Codemod<TSX> = async (root) => {
  const result = analyzeCreateEffect(root.root(), {
    filename: root.relativeFilename().replaceAll("\\", "/"),
    source: root.source(),
  });
  if (result.rule.ruleId !== "S2-EFFECT-001") {
    throw new Error(`unexpected rule metadata: ${result.rule.ruleId}`);
  }
  if (result.findings.length !== 5) {
    throw new Error(`expected five createEffect findings, got ${result.findings.length}`);
  }
  const lines = result.findings.map((finding) => finding.location.line);
  if (lines.join(",") !== "3,7,12,13,14") {
    throw new Error(`unexpected createEffect finding lines: ${lines.join(",")}`);
  }
  if (!result.findings[0]?.guidance) {
    throw new Error("createEffect finding must contain self-contained guidance");
  }
  return null;
};

export default testCreateEffectRule;
