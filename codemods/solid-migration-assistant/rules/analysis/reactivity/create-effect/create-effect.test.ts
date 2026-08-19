import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateEffect } from "./create-effect.ts";
import { formatCreateEffectGuidance } from "./report.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup";

const testCreateEffectRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const { guidance, report } = analyzeCreateEffect(root.root(), { filename });

  const isFixture = root.source().includes('from "solid-js"') ||
    root.source().includes('from "solid\\x2djs"');

  if (isFixture) {
    if (guidance.length === 0) {
      throw new Error("expected createEffect findings but got none");
    }
  }

  if (!isFixture) {
    if (guidance.length > 0) {
      throw new Error(
        `unexpected createEffect findings in non-Solid fixture: ${guidance.join("\n")}`,
      );
    }
  }

  if (guidance.some((entry) => !entry.includes(MIGRATION_GUIDE))) {
    throw new Error("every createEffect finding must link the migration guide");
  }

  if (guidance.some((entry) => entry.includes("[S2-EFFECT-001]"))) {
    throw new Error("createEffect guidance must not expose the old rule ID");
  }

  if (guidance.some((entry) => !entry.includes("Manual review required"))) {
    throw new Error("every createEffect finding must require manual review");
  }

  // Verify each finding starts with the correct location prefix
  for (const entry of guidance) {
    if (!entry.startsWith(filename)) {
      throw new Error(`finding must start with filename: ${entry}`);
    }
  }

  // Verify we have findings for all expected call sites
  // 1-arg sites (7 total: 5 direct + alias + namespace)
  const oneArgSites = ["6:1", "11:1", "16:1", "17:1", "19:1", "48:1", "49:1"];
  // 0-arg sites
  const zeroArgSites = ["15:1", "43:1"];
  // 2-arg sites (already split + initialValue)
  const twoArgSites = ["21:1", "26:1"];
  // 3-arg site
  const threeArgSites = ["34:1"];

  const allExpected = isFixture
    ? [...oneArgSites, ...zeroArgSites, ...twoArgSites, ...threeArgSites]
    : [];

  const foundLocations = guidance.map((entry) => {
    const afterFile = entry.slice(filename.length + 1);
    const spaceIdx = afterFile.indexOf(" ");
    return spaceIdx >= 0 ? afterFile.slice(0, spaceIdx) : afterFile;
  });

  for (const loc of allExpected) {
    if (!foundLocations.includes(loc)) {
      throw new Error(`missing finding for location ${loc}. Found: ${foundLocations.join(", ")}`);
    }
  }

  if (isFixture && foundLocations.length !== allExpected.length) {
    throw new Error(
      `expected ${allExpected.length} findings but got ${foundLocations.length}. ` +
      `Expected: ${allExpected.join(", ")}. Found: ${foundLocations.join(", ")}`,
    );
  }


  for (const [index, finding] of report.findings.entries()) {
    if ("guidance" in finding || !finding.summary || !finding.reason || finding.nextSteps.length === 0 || !finding.officialGuideUrl) {
      throw new Error("createEffect report must expose structured guidance fields only");
    }
    if (formatCreateEffectGuidance(finding) !== guidance[index]) throw new Error("createEffect terminal guidance drifted from its report contract");
    if (!finding.snippet.text.includes("createEffect")) throw new Error("createEffect snippet must contain the matched call");
    if (finding.snippet.startLine !== Math.max(1, finding.line - 1)) {
      throw new Error(`snippet must start one complete line before ${finding.line}`);
    }
    if (finding.snippet.endLine < finding.line || finding.snippet.text.split("\n").length !== finding.snippet.endLine - finding.snippet.startLine + 1) {
      throw new Error(`snippet must include the full match and complete line bounds at ${finding.line}`);
    }
  }

  return null;
};

export default testCreateEffectRule;
