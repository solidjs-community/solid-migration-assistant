import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { ANALYSIS_STATE_KEY } from "./analysis.ts";
import { TRANSFORM_REPORT_STATE_KEY, type TransformChange } from "./transform.ts";

type AnalysisRule = (
  rootNode: SgNode<TSX>,
  context: { filename: string },
) => string[];

type TransformRule = (
  rootNode: SgNode<TSX>,
  filename: string,
) => TransformChange[];

export function createAnalysisEntrypoint(rule: AnalysisRule): Codemod<TSX> {
  return async (root) => {
    const guidance = rule(root.root(), {
      filename: root.relativeFilename().replaceAll("\\", "/"),
    });
    if (guidance.length === 0) return null;

    const release = acquireLock(ANALYSIS_STATE_KEY);
    try {
      const accumulated = getState<string[]>(ANALYSIS_STATE_KEY) ?? [];
      setState(ANALYSIS_STATE_KEY, [...new Set([...accumulated, ...guidance])]);
    } finally {
      release();
    }

    return null;
  };
}

export function createTransformEntrypoint(rule: TransformRule): Codemod<TSX> {
  return async (root) => {
    const rootNode = root.root();
    const filename = root.relativeFilename().replaceAll("\\", "/");
    const changes = rule(rootNode, filename);
    if (changes.length === 0) return null;

    const release = acquireLock(TRANSFORM_REPORT_STATE_KEY);
    try {
      const accumulated =
        getState<string[]>(TRANSFORM_REPORT_STATE_KEY) ?? [];
      setState(TRANSFORM_REPORT_STATE_KEY, [
        ...new Set([...accumulated, ...changes.map(({ report }) => report)]),
      ]);
    } finally {
      release();
    }

    return rootNode.commitEdits(changes.map(({ edit }) => edit));
  };
}
