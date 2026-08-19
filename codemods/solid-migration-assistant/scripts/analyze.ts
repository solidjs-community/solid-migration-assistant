import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { analyzeBeta32SubpathImports } from "../rules/analysis/imports/beta32-subpaths/beta32-subpaths.ts";
import { analyzeWebImport } from "../rules/analysis/imports/web-import/web-import.ts";
import { webImportReportAggregator } from "../rules/analysis/imports/web-import/report.ts";
import { analyzeJsxClassListAttributes } from "../rules/analysis/jsx/class-list/class-list.ts";
import { analyzeJsxComponentRenames } from "../rules/analysis/jsx/component-renames/component-renames.ts";
import { componentRenamesReportAggregator } from "../rules/analysis/jsx/component-renames/report.ts";
import { analyzeOnMount } from "../rules/analysis/lifecycle/on-mount/on-mount.ts";
import { analyzeMergeProps } from "../rules/analysis/props/merge-props/merge-props.ts";
import { analyzeSplitProps } from "../rules/analysis/props/split-props/split-props.ts";
import { analyzeCreateComputed } from "../rules/analysis/reactivity/create-computed/create-computed.ts";
import { analyzeCreateEffect } from "../rules/analysis/reactivity/create-effect/create-effect.ts";
import { createEffectReportAggregator } from "../rules/analysis/reactivity/create-effect/report.ts";
import { analyzeCreateMemo } from "../rules/analysis/reactivity/create-memo/create-memo.ts";
import {
  analyzeCreateMutable,
  analyzeModifyMutable,
} from "../rules/analysis/store/mutable/mutable.ts";
import { analyzeProduce } from "../rules/analysis/store/produce/produce.ts";
import { analyzeUnwrap } from "../rules/analysis/store/unwrap/unwrap.ts";
import { analyzeBatch } from "../rules/analysis/reactivity/batch/batch.ts";
import { analyzeOnHelper } from "../rules/analysis/reactivity/on-helper/on-helper.ts";
import { analyzeCreateResource } from "../rules/analysis/reactivity/create-resource/create-resource.ts";
import { analyzeOnCleanup } from "../rules/analysis/lifecycle/on-cleanup/on-cleanup.ts";
import {
  analyzeOnError,
  analyzeCatchError,
  analyzeResetErrorBoundaries,
} from "../rules/analysis/reactivity/error-handling/error-handling.ts";
import {
  analyzeStartTransition,
  analyzeUseTransition,
  analyzeCreateDeferred,
} from "../rules/analysis/reactivity/transition-apis/transition-apis.ts";
import { analyzeCreateSelector } from "../rules/analysis/reactivity/create-selector/create-selector.ts";
import { analyzeIndexArray } from "../rules/analysis/reactivity/index-array/index-array.ts";
import { analyzeCreateDynamic } from "../rules/analysis/reactivity/create-dynamic/create-dynamic.ts";
import {
  analyzeFrom,
  analyzeObservable,
} from "../rules/analysis/reactivity/from-observable/from-observable.ts";
import {
  analyzeEqualFn,
  analyzeGetListener,
  analyzeWriteSignal,
  analyzeEnableScheduling,
} from "../rules/analysis/reactivity/utility-renames/utility-renames.ts";
import { analyzeDomAttrNamespaces } from "../rules/analysis/jsx/dom-attr-namespaces/dom-attr-namespaces.ts";
import { analyzeDomEventNamespaces } from "../rules/analysis/jsx/dom-event-namespaces/dom-event-namespaces.ts";
import { analyzeDomUseDirective } from "../rules/analysis/jsx/dom-use-directive/dom-use-directive.ts";
import { analyzeContextProvider } from "../rules/analysis/jsx/context-provider/context-provider.ts";
import { relocateLegacySubpaths } from "../rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts";
import { legacySubpathRelocationReportAggregator } from "../rules/transformations/imports/legacy-subpath-relocation/report.ts";
import { ANALYSIS_STATE_KEY } from "../shared/analysis.ts";
import { aggregateRuleReports, DASHBOARD_REPORT_STATE_KEY } from "../shared/report.ts";
import type { JsonValue } from "../shared/report.ts";

type Analyzer = (
  rootNode: SgNode<TSX>,
  context: { filename: string },
) => string[];

const analyzers: Analyzer[] = [
  analyzeBeta32SubpathImports,
  analyzeJsxClassListAttributes,
  analyzeOnMount,
  analyzeMergeProps,
  analyzeSplitProps,
  analyzeCreateComputed,
  analyzeCreateMemo,
  analyzeCreateMutable,
  analyzeModifyMutable,
  analyzeProduce,
  analyzeUnwrap,
  analyzeBatch,
  analyzeOnHelper,
  analyzeCreateResource,
  analyzeOnCleanup,
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
  const webImport = analyzeWebImport(rootNode, context);
  const createEffect = analyzeCreateEffect(rootNode, context);
  const componentRenames = analyzeJsxComponentRenames(rootNode, context);
  const relocationPreview = relocateLegacySubpaths(rootNode, context.filename);
  const guidance = [
    ...analyzers.flatMap((analyzer) => analyzer(rootNode, context)),
    ...webImport.guidance,
    ...createEffect.guidance,
    ...componentRenames.guidance,
  ];

  const release = acquireLock(ANALYSIS_STATE_KEY);
  try {
    const accumulated = getState<string[]>(ANALYSIS_STATE_KEY) ?? [];
    setState(ANALYSIS_STATE_KEY, [...new Set([...accumulated, ...guidance])]);
    const reports =
      getState<Record<string, JsonValue>>(DASHBOARD_REPORT_STATE_KEY) ?? {};
    setState(
      DASHBOARD_REPORT_STATE_KEY,
      aggregateRuleReports(reports, [
        [webImportReportAggregator, webImport.report],
        [createEffectReportAggregator, createEffect.report],
        [componentRenamesReportAggregator, componentRenames.report],
        [legacySubpathRelocationReportAggregator, relocationPreview.report],
      ]),
    );
  } finally {
    release();
  }

  return null;
};

export default analyze;
