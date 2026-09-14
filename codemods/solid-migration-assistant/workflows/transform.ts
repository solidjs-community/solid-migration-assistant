/**
 * The opt-in `transform` workflow. Its three deterministic rewrites stay
 * three separate commands awaited in sequence, as the former YAML workflow
 * ran them as separate steps: each command reads the files the previous
 * command committed, so later rules see earlier output. The rules operate on
 * disjoint syntax today, but sequencing is what the exact-output and
 * idempotency tests prove, not a merged single pass.
 *
 * These three mutate the target, so unlike the read-only analyzers they are
 * deliberately not declared as one overlapping group: their order is a
 * correctness property of the files they write, not a schedule.
 *
 * Each transform returns the rewritten file as its content and the per-edit
 * report lines as structured output; the workflow body flattens,
 * deduplicates, and sorts the lines and returns them as data.
 */
import { jssg, workflow } from "@codemod.com/orchestration";
import { relocateLegacySubpaths } from "../rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts";
import { relocateWebPackage } from "../rules/transformations/imports/web-package-relocation/web-package-relocation.ts";
import { rewriteClassListToClass } from "../rules/transformations/jsx/class-list-to-class/class-list-to-class.ts";
import { transformFile } from "../shared/entrypoint.ts";
import {
  aggregateReport,
  FileStrings,
  SOURCE_EXCLUDE,
  SOURCE_INCLUDE,
} from "../shared/workflow.ts";

const legacySubpaths = jssg({
  name: "relocateLegacySubpaths",
  language: "tsx",
  include: SOURCE_INCLUDE,
  exclude: SOURCE_EXCLUDE,
  output: FileStrings,
  transform: (root) => transformFile(relocateLegacySubpaths, root),
});

const webPackage = jssg({
  name: "relocateWebPackage",
  language: "tsx",
  include: SOURCE_INCLUDE,
  exclude: SOURCE_EXCLUDE,
  output: FileStrings,
  transform: (root) => transformFile(relocateWebPackage, root),
});

const classListToClass = jssg({
  name: "rewriteClassListToClass",
  language: "tsx",
  include: SOURCE_INCLUDE,
  exclude: SOURCE_EXCLUDE,
  output: FileStrings,
  transform: (root) => transformFile(rewriteClassListToClass, root),
});

/** Every rewrite, in the order the former YAML workflow ran its steps. */
export const rewrites = [legacySubpaths, webPackage, classListToClass];

export default workflow(async () => {
  const commands: string[][][] = [];
  for (const rewrite of rewrites) {
    commands.push(await rewrite());
  }
  return { report: aggregateReport(commands) };
});
