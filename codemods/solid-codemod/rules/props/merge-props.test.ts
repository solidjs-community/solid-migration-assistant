import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeMergeProps } from "./merge-props.ts";

const testMergePropsRule: Codemod<TSX> = async (root) => {
  const source = root.source();
  const result = analyzeMergeProps(root.root(), {
    filename: root.relativeFilename().replaceAll("\\", "/"),
    source,
  });
  if (result.rule.ruleId !== "S2-PROPS-001") {
    throw new Error(`unexpected rule metadata: ${result.rule.ruleId}`);
  }
  const expectedFindings = source.includes('from "solid-js"') ? 4 : 0;
  if (result.findings.length !== expectedFindings) {
    throw new Error(
      `expected ${expectedFindings} mergeProps findings, got ${result.findings.length}`,
    );
  }
  if (expectedFindings > 0) {
    const lines = result.findings.map((finding) => finding.location.line);
    if (lines.join(",") !== "10,11,13,14") {
      throw new Error(`unexpected mergeProps finding lines: ${lines.join(",")}`);
    }
    const sourceCounts = result.findings.map(
      (finding) => finding.evidence.sourceCount,
    );
    if (sourceCounts.join(",") !== "2,2,1,2") {
      throw new Error(`unexpected mergeProps source counts: ${sourceCounts.join(",")}`);
    }
    const spreadFlags = result.findings.map(
      (finding) => finding.evidence.hasSpreadArguments,
    );
    if (spreadFlags.join(",") !== "false,false,true,false") {
      throw new Error(`unexpected mergeProps spread evidence: ${spreadFlags.join(",")}`);
    }
  }
  for (const finding of result.findings) {
    if (
      finding.route !== "agent-guided" ||
      finding.evidence.importedName !== "mergeProps" ||
      !finding.guidance.includes("undefined") ||
      !finding.guidance.includes("merge") ||
      !finding.guidance.includes("Stop")
    ) {
      throw new Error("mergeProps finding must contain route, evidence, and guidance");
    }
  }
  return null;
};

export default testMergePropsRule;
