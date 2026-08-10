import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { analyzeBeta32SubpathImports } from "../rules/imports/beta32-subpaths.ts";
import { analyzeWebImport } from "../rules/imports/web-import.ts";
import { analyzeJsxClassListAttributes } from "../rules/jsx/class-list.ts";
import { analyzeJsxComponentRenames } from "../rules/jsx/component-renames.ts";
import { analyzeOnMount } from "../rules/lifecycle/on-mount.ts";
import { analyzeMergeProps } from "../rules/props/merge-props.ts";
import { analyzeSplitProps } from "../rules/props/split-props.ts";
import { analyzeCreateComputed } from "../rules/reactivity/create-computed.ts";
import { analyzeCreateEffect } from "../rules/reactivity/create-effect.ts";
import { analyzeCreateMemo } from "../rules/reactivity/create-memo.ts";
import {
  analyzeCreateMutable,
  analyzeModifyMutable,
} from "../rules/store/mutable.ts";
import { analyzeProduce } from "../rules/store/produce.ts";
import { analyzeUnwrap } from "../rules/store/unwrap.ts";
import { ANALYSIS_STATE_KEY } from "../shared/analysis.ts";

type Analyzer = (
  rootNode: SgNode<TSX>,
  context: { filename: string },
) => string[];

const analyzers: Analyzer[] = [
  analyzeBeta32SubpathImports,
  analyzeWebImport,
  analyzeJsxClassListAttributes,
  analyzeJsxComponentRenames,
  analyzeOnMount,
  analyzeMergeProps,
  analyzeSplitProps,
  analyzeCreateComputed,
  analyzeCreateEffect,
  analyzeCreateMemo,
  analyzeCreateMutable,
  analyzeModifyMutable,
  analyzeProduce,
  analyzeUnwrap,
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
