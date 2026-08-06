import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateComputed } from "./create-computed.ts";

const testCreateComputedRule: Codemod<TSX> = async (root) => {
  const source = root.source();
  const result = analyzeCreateComputed(root.root(), {
    filename: root.relativeFilename().replaceAll("\\", "/"),
    source,
  });
  if (result.rule.ruleId !== "S2-COMPUTED-001") {
    throw new Error(`unexpected rule metadata: ${result.rule.ruleId}`);
  }
  const expectedFindings = source.includes('from "solid-js"') ? 7 : 0;
  if (result.findings.length !== expectedFindings) {
    throw new Error(
      `expected ${expectedFindings} createComputed findings, got ${result.findings.length}`,
    );
  }
  if (expectedFindings > 0) {
    const lines = result.findings.map((finding) => finding.location.line);
    if (lines.join(",") !== "8,9,10,11,12,13,14") {
      throw new Error(`unexpected createComputed finding lines: ${lines.join(",")}`);
    }
    const argumentCounts = result.findings.map(
      (finding) => finding.evidence.argumentCount,
    );
    if (argumentCounts.join(",") !== "1,1,1,1,1,2,3") {
      throw new Error(
        `unexpected createComputed argument counts: ${argumentCounts.join(",")}`,
      );
    }
  }
  for (const finding of result.findings) {
    if (
      finding.route !== "agent-guided" ||
      finding.evidence.importedName !== "createComputed" ||
      !finding.guidance.includes("createMemo") ||
      !finding.guidance.includes("createEffect") ||
      !finding.guidance.includes("createSignal") ||
      !finding.guidance.includes("createStore") ||
      !finding.guidance.includes("Stop")
    ) {
      throw new Error("createComputed finding must contain route, evidence, and guidance");
    }
  }
  return null;
};

export default testCreateComputedRule;
