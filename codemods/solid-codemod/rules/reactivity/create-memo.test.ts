import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateMemo } from "./create-memo.ts";

const testCreateMemoRule: Codemod<TSX> = async (root) => {
  const source = root.source();
  const result = analyzeCreateMemo(root.root(), {
    filename: root.relativeFilename().replaceAll("\\", "/"),
    source,
  });
  if (result.rule.ruleId !== "S2-MEMO-001") {
    throw new Error(`unexpected rule metadata: ${result.rule.ruleId}`);
  }
  const expectedFindings = source.includes('from "solid-js"') ? 5 : 0;
  if (result.findings.length !== expectedFindings) {
    throw new Error(
      `expected ${expectedFindings} createMemo findings, got ${result.findings.length}`,
    );
  }
  if (expectedFindings > 0) {
    const lines = result.findings.map((finding) => finding.location.line);
    if (lines.join(",") !== "6,7,8,9,10") {
      throw new Error(`unexpected createMemo finding lines: ${lines.join(",")}`);
    }
    const argumentCounts = result.findings.map(
      (finding) => finding.evidence.argumentCount,
    );
    if (argumentCounts.join(",") !== "2,3,2,2,3") {
      throw new Error(`unexpected createMemo argument counts: ${argumentCounts.join(",")}`);
    }
    const legacyOptions = result.findings.map(
      (finding) => finding.evidence.hasLegacyOptions,
    );
    if (legacyOptions.join(",") !== "false,true,false,false,true") {
      throw new Error(`unexpected createMemo option evidence: ${legacyOptions.join(",")}`);
    }
  }
  for (const finding of result.findings) {
    if (
      finding.route !== "manual" ||
      finding.evidence.importedName !== "createMemo" ||
      finding.evidence.hasLegacyInitialValue !== true ||
      !finding.guidance.includes("initial value") ||
      !finding.guidance.includes("Do not perform")
    ) {
      throw new Error("createMemo finding must contain route, evidence, and guidance");
    }
  }
  return null;
};

export default testCreateMemoRule;
