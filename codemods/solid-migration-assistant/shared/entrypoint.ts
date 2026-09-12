import type { SgNode, SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import type { TransformChange } from "./transform.ts";

/**
 * The per-file adapter between a rule and an inline JSSG transform. Every
 * workflow definition's transform is `(root) => analyzeFile(rule, root)` or
 * `(root) => transformFile(rule, root)`; the build step bundles this module
 * and the rule into the transform's artifact, so nothing here may import the
 * orchestration runtime. Each call returns one structured result that the
 * runtime aggregates in file order; the workflow body then flattens,
 * deduplicates, and sorts the strings.
 */

export type AnalysisRule = (
  rootNode: SgNode<TSX>,
  context: { filename: string },
) => string[];

export type TransformRule = (
  rootNode: SgNode<TSX>,
  filename: string,
) => TransformChange[];

/**
 * One file's structured result: `content` is the rewritten source (`null`
 * leaves the file untouched) and `output` the strings the workflow
 * aggregates. A transform returns `null` instead when it has nothing to
 * report, which produces neither an edit nor an output entry.
 */
export type FileResult = { content: string | null; output: string[] };

export function relativeFilename(root: SgRoot<TSX>): string {
  return root.relativeFilename().replaceAll("\\", "/");
}

/** Run a read-only rule: never an edit, one output entry per file with guidance. */
export function analyzeFile(
  rule: AnalysisRule,
  root: SgRoot<TSX>,
): FileResult | null {
  const guidance = rule(root.root(), { filename: relativeFilename(root) });
  if (guidance.length === 0) return null;
  return { content: null, output: guidance };
}

/** Run a rewrite rule: the committed edits become the file content, the reports its output. */
export function transformFile(
  rule: TransformRule,
  root: SgRoot<TSX>,
): FileResult | null {
  const rootNode = root.root();
  const changes = rule(rootNode, relativeFilename(root));
  if (changes.length === 0) return null;
  return {
    content: rootNode.commitEdits(changes.map(({ edit }) => edit)),
    output: changes.map(({ report }) => report),
  };
}
