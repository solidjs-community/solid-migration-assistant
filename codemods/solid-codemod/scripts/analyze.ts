import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";
import { acquireLock, getState, setState } from "codemod:workflow";
import { analyzeWebImport } from "../rules/imports/web-import.ts";
import { analyzeOnMount } from "../rules/lifecycle/on-mount.ts";
import { analyzeMergeProps } from "../rules/props/merge-props.ts";
import { analyzeCreateComputed } from "../rules/reactivity/create-computed.ts";
import { analyzeCreateEffect } from "../rules/reactivity/create-effect.ts";
import { analyzeCreateMemo } from "../rules/reactivity/create-memo.ts";
import {
  REPORT_STATE_KEY,
  type AnalysisState,
  type MigrationFinding,
  type RuleMetadata,
} from "../shared/types.ts";

const findingMetric = useMetricAtom("solid-v2-migration-findings");
type Analyzer = (
  rootNode: SgNode<TSX>,
  context: { filename: string; source: string },
) => { rule: RuleMetadata; findings: MigrationFinding[] };
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
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const source = root.source();
  const results = analyzers.map((analyzer) =>
    analyzer(rootNode, { filename, source }),
  );
  const rules = deduplicateRules(results.map(({ rule }) => rule));
  const findings = deduplicateFindings(
    results.flatMap((result) => result.findings),
  );

  const release = acquireLock(REPORT_STATE_KEY);
  try {
    const accumulated = getState<AnalysisState>(REPORT_STATE_KEY) ?? {
      rules: [],
      findings: [],
    };
    setState(REPORT_STATE_KEY, {
      rules: deduplicateRules([...accumulated.rules, ...rules]),
      findings: deduplicateFindings([...accumulated.findings, ...findings]),
    });
  } finally {
    release();
  }

  for (const item of findings) {
    findingMetric.increment({
      file: item.location.file,
      route: item.route,
      ruleId: item.ruleId,
    });
    console.warn(
      `[solid-v2-analysis] ${item.ruleId} ${item.location.file}:${item.location.line}:${item.location.column} ${item.route}`,
    );
  }

  return null;
};

function deduplicateFindings(
  findings: MigrationFinding[],
): MigrationFinding[] {
  return [...new Map(findings.map((item) => [item.id, item])).values()];
}

function deduplicateRules(rules: RuleMetadata[]): RuleMetadata[] {
  return [...new Map(rules.map((rule) => [rule.ruleId, rule])).values()];
}

export default analyze;
