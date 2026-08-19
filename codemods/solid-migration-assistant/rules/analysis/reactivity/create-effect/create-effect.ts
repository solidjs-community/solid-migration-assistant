import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls, sourceSnippet } from "../../../../shared/analysis.ts";
import type { AnalysisRuleResult } from "../../../../shared/report.ts";
import { formatCreateEffectGuidance, type CreateEffectContent, type CreateEffectFinding, type CreateEffectReport } from "./report.ts";

const MIGRATION_GUIDE = "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup";
const MANUAL_VALIDATION = "Make and validate this migration yourself; this analyzer never edits or runs the target project.";

export function analyzeCreateEffect(rootNode: SgNode<TSX>, context: { filename: string }): AnalysisRuleResult<CreateEffectReport> {
  const findings: CreateEffectFinding[] = findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "createEffect")
    .filter(({ argumentNodes }) => !argumentNodes.some((a) => a.kind() === "spread_element"))
    .map(({ call, argumentNodes, filename }) => {
      const start = call.range().start;
      const argumentCount = argumentNodes.length;
      return {
        filename, line: start.line + 1, column: start.column + 1, argumentCount,
        ...contentForArgumentCount(argumentCount), snippet: sourceSnippet(call),
      };
    });
  return { guidance: findings.map(formatCreateEffectGuidance), report: { findings } };
}

function contentForArgumentCount(argumentCount: number): CreateEffectContent {
  if (argumentCount === 0) return {
    summary: "Manual review required: migrate this zero-argument createEffect call.",
    reason: "Solid 2 requires separate compute and apply callbacks; a zero-argument call is likely a stub or placeholder.",
    nextSteps: ["Add explicit compute and apply callbacks, or remove the empty call if it is dead code.", MANUAL_VALIDATION],
    cautions: [], validation: [], officialGuideUrl: MIGRATION_GUIDE,
  };
  if (argumentCount === 1) return {
    summary: "Manual review required: split this one-argument createEffect into compute and apply callbacks.",
    reason: "Solid 2 requires separate compute and apply callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.",
    nextSteps: [
      "Read the full callback, imports, and nearby reactive declarations.",
      "Identify the reactive reads that should trigger the effect, move those reads into the compute callback, return the value the side effect needs, and perform the imperative operation in the apply callback without adding reactive dependencies.",
      MANUAL_VALIDATION,
    ],
    cautions: ["Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent."],
    validation: ["Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable."], officialGuideUrl: MIGRATION_GUIDE,
  };
  if (argumentCount === 2) return {
    summary: "Manual review required: migrate this two-argument createEffect call.",
    reason: "Solid 2 treats the second argument as options, not an initial value. If this call's second argument is an initial value, it must move to a default parameter of the compute callback. If it is already an apply callback for the split-effect pattern, confirm compatibility with Solid 2 option handling.",
    nextSteps: [
      "Read both arguments.",
      "If the second argument is a non-function initial value or a function that represents the legacy initialValue parameter, move it to a default parameter on the compute callback: createEffect((prev = INITIAL_VALUE) => compute(prev), applyFn).",
      "If the second argument is already the apply function for a manually split effect, verify that no Solid 1.x initialValue semantic is accidentally carried forward and that the call expects the second argument to be options in Solid 2.",
      MANUAL_VALIDATION,
    ],
    cautions: ["Stop without proposing a rewrite when the intent of the second argument is unclear, the callback contains cleanup or async work, or the distinction between initialValue and apply callback cannot be resolved from static context."],
    validation: ["Ask for the smallest focused test or runtime observation that makes the second-argument intent observable."], officialGuideUrl: MIGRATION_GUIDE,
  };
  return {
    summary: `Manual review required: migrate this ${argumentCount}-argument createEffect call.`,
    reason: "Solid 2 treats the second argument as options, not an initial value, and does not support a third positional argument. Legacy three-argument calls (callback, initialValue, options) must be restructured.",
    nextSteps: [
      "Move the initial value to a default parameter on the compute callback, and move any legacy options that have Solid 2 equivalents into the second-argument options object.",
      "Verify that every legacy option is either mapped to a Solid 2 equivalent or intentionally dropped.", MANUAL_VALIDATION,
    ],
    cautions: ["Stop without proposing a rewrite when the intent of each argument is unclear."],
    validation: ["Ask for the smallest focused test or runtime observation that makes the argument roles observable."], officialGuideUrl: MIGRATION_GUIDE,
  };
}
