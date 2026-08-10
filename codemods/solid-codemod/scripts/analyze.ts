import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { analyzeWebImport } from "../rules/imports/web-import.ts";
import { analyzeOnMount } from "../rules/lifecycle/on-mount.ts";
import { analyzeMergeProps } from "../rules/props/merge-props.ts";
import { analyzeCreateComputed } from "../rules/reactivity/create-computed.ts";
import { analyzeCreateEffect } from "../rules/reactivity/create-effect.ts";
import { analyzeCreateMemo } from "../rules/reactivity/create-memo.ts";
import { ANALYSIS_STATE_KEY } from "../shared/analysis.ts";

type Analyzer = (
  rootNode: SgNode<TSX>,
  context: { filename: string },
) => string[];

const analyzers: Analyzer[] = [
  analyzeWebImport,
  analyzeOnMount,
  analyzeMergeProps,
  analyzeCreateComputed,
  analyzeCreateEffect,
  analyzeCreateMemo,
];

const analyze: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const context = {
    filename: root.relativeFilename().replaceAll("\\", "/"),
  };
  const guidance = analyzers.flatMap((analyzer) => analyzer(rootNode, context));

  const release = acquireLock(ANALYSIS_STATE_KEY);
  try {
    const accumulated = getState<string[]>(ANALYSIS_STATE_KEY) ?? [];
    setState(ANALYSIS_STATE_KEY, [...new Set([...accumulated, ...guidance])]);
  } finally {
    release();
  }

  return null;
};

export default analyze;
