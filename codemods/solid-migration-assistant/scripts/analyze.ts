import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { analyzeBeta32SubpathImports } from "../rules/imports/beta32-subpaths/beta32-subpaths.ts";
import { analyzeWebImport } from "../rules/imports/web-import/web-import.ts";
import { analyzeJsxClassListAttributes } from "../rules/jsx/class-list/class-list.ts";
import { analyzeJsxComponentRenames } from "../rules/jsx/component-renames/component-renames.ts";
import { analyzeOnMount } from "../rules/lifecycle/on-mount/on-mount.ts";
import { analyzeMergeProps } from "../rules/props/merge-props/merge-props.ts";
import { analyzeSplitProps } from "../rules/props/split-props/split-props.ts";
import { analyzeCreateComputed } from "../rules/reactivity/create-computed/create-computed.ts";
import { analyzeCreateEffect } from "../rules/reactivity/create-effect/create-effect.ts";
import { analyzeCreateMemo } from "../rules/reactivity/create-memo/create-memo.ts";
import {
  analyzeCreateMutable,
  analyzeModifyMutable,
} from "../rules/store/mutable/mutable.ts";
import { analyzeProduce } from "../rules/store/produce/produce.ts";
import { analyzeUnwrap } from "../rules/store/unwrap/unwrap.ts";
import { analyzeBatch } from "../rules/reactivity/batch/batch.ts";
import { analyzeOnHelper } from "../rules/reactivity/on-helper/on-helper.ts";
import { analyzeCreateResource } from "../rules/reactivity/create-resource/create-resource.ts";
import {
  analyzeOnError,
  analyzeCatchError,
  analyzeResetErrorBoundaries,
} from "../rules/reactivity/error-handling/error-handling.ts";
import {
  analyzeStartTransition,
  analyzeUseTransition,
  analyzeCreateDeferred,
} from "../rules/reactivity/transition-apis/transition-apis.ts";
import {
  analyzeCreateSelector,
  analyzeIndexArray,
} from "../rules/reactivity/selector-and-index/selector-and-index.ts";
import {
  analyzeCreateDynamic,
  analyzeFrom,
  analyzeObservable,
} from "../rules/reactivity/dynamic-and-stream/dynamic-and-stream.ts";
import {
  analyzeEqualFn,
  analyzeGetListener,
  analyzeWriteSignal,
  analyzeEnableScheduling,
} from "../rules/reactivity/utility-renames/utility-renames.ts";
import { analyzeDomAttrNamespaces } from "../rules/jsx/dom-attr-namespaces/dom-attr-namespaces.ts";
import { analyzeDomEventNamespaces } from "../rules/jsx/dom-event-namespaces/dom-event-namespaces.ts";
import { analyzeDomUseDirective } from "../rules/jsx/dom-use-directive/dom-use-directive.ts";
import { analyzeContextProvider } from "../rules/jsx/context-provider/context-provider.ts";
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
  analyzeBatch,
  analyzeOnHelper,
  analyzeCreateResource,
  analyzeOnError,
  analyzeCatchError,
  analyzeResetErrorBoundaries,
  analyzeStartTransition,
  analyzeUseTransition,
  analyzeCreateDeferred,
  analyzeCreateSelector,
  analyzeIndexArray,
  analyzeCreateDynamic,
  analyzeFrom,
  analyzeObservable,
  analyzeEqualFn,
  analyzeGetListener,
  analyzeWriteSignal,
  analyzeEnableScheduling,
  analyzeDomAttrNamespaces,
  analyzeDomEventNamespaces,
  analyzeDomUseDirective,
  analyzeContextProvider,
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
