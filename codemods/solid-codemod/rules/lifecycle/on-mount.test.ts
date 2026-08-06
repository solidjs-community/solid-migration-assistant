import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeOnMount } from "./on-mount.ts";

const testOnMountRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const source = root.source();
  const result = analyzeOnMount(root.root(), {
    filename,
    source,
  });
  if (result.rule.ruleId !== "S2-LIFECYCLE-001") {
    throw new Error(`unexpected rule metadata: ${result.rule.ruleId}`);
  }
  const expectedFindings = source.includes('from "solid-js"') ? 7 : 0;
  if (result.findings.length !== expectedFindings) {
    throw new Error(
      `expected ${expectedFindings} onMount findings, got ${result.findings.length}`,
    );
  }
  if (expectedFindings > 0) {
    const lines = result.findings.map((finding) => finding.location.line);
    if (lines.join(",") !== "6,10,14,20,25,26,27") {
      throw new Error(`unexpected onMount finding lines: ${lines.join(",")}`);
    }
  }
  for (const finding of result.findings) {
    if (
      finding.route !== "agent-guided" ||
      finding.evidence.importedName !== "onMount" ||
      !finding.guidance.includes("onSettled") ||
      !finding.guidance.includes("Stop")
    ) {
      throw new Error("onMount finding must contain its route, evidence, and guidance");
    }
  }
  return null;
};

export default testOnMountRule;
