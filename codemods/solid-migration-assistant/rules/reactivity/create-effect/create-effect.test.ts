import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeCreateEffect } from "./create-effect.ts";

const MIGRATION_GUIDE =
  "https://github.com/solidjs/solid/blob/3194631aeeb2b2e360817dc887ab5cbce7548359/documentation/solid-2.0/MIGRATION.md#effects-lifecycle-and-cleanup";

const testCreateEffectRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeCreateEffect(root.root(), { filename });
  const locations = root.source().includes('from "solid-js"')
    ? ["6:1", "11:1", "16:1", "17:1", "19:1"]
    : [];
  const expected = locations.map(
    (location) => `${filename}:${location} Manual review required: split this one-argument createEffect into compute and apply callbacks.
Why: Solid 2 requires separate compute and apply callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.
Guidance: Read the full callback, imports, and nearby reactive declarations. Identify the reactive reads that should trigger the effect, move those reads into the compute callback, return the value the side effect needs, and perform the imperative operation in the apply callback without adding reactive dependencies. Make and validate this migration yourself; this analyzer never edits or runs the target project. Stop without proposing a rewrite when the effect contains cleanup, async work, nested control flow affecting reads, reactive primitive creation, unrelated operations, writes that may affect its own inputs, or unclear intent. Ask for the smallest focused test or runtime observation that makes the missing behavior decision observable. Official migration guide: ${MIGRATION_GUIDE}`,
  );

  if (guidance.join("\n---finding---\n") !== expected.join("\n---finding---\n")) {
    throw new Error(
      `unexpected createEffect guidance:\n${guidance.join("\n---finding---\n")}`,
    );
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

  return null;
};

export default testCreateEffectRule;
