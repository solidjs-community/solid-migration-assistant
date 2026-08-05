import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { useMetricAtom } from "codemod:metrics";
import { acquireLock, getState, setState } from "codemod:workflow";
import {
  REPORT_STATE_KEY,
  RULE_IDS,
  type MigrationFinding,
  type RuleId,
} from "./report.ts";
import {
  findStaticWebImports,
  stringLiteralValue,
} from "./static-web-imports.ts";

const findingMetric = useMetricAtom("solid-v2-migration-findings");

const analyze: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const source = root.source();
  const fileFindings: MigrationFinding[] = [];

  for (const match of findStaticWebImports(rootNode)) {
    fileFindings.push(
      finding({
        filename,
        node: match.source,
        ruleId: RULE_IDS.webImport,
        title: "Move the Solid web renderer import",
        route: "safe-transform",
        source,
        reason:
          "Solid 2 publishes the web renderer from @solidjs/web instead of the solid-js/web subpath.",
        evidence: {
          moduleSource: "solid-js/web",
          syntax: "static-import",
        },
        nextAction: {
          kind: "workflow",
          command: "pnpm transform:web-imports --target .",
        },
      }),
    );
  }

  for (const call of directOneArgumentCreateEffectCalls(rootNode)) {
    const location = call.range().start;
    fileFindings.push(
      finding({
        filename,
        node: call,
        ruleId: RULE_IDS.effect,
        title: "Split this one-argument createEffect",
        route: "agent-guided",
        source,
        reason:
          "Solid 2 requires separate compute and effect callbacks; the correct split depends on which reads are reactive inputs and which statements are side effects.",
        evidence: {
          importedName: "createEffect",
          argumentCount: 1,
          syntax: "direct-call",
        },
        nextAction: {
          kind: "skill",
          skill: "migrate-solid-create-effect",
          prompt: `Explain the ${RULE_IDS.effect} finding at ${filename}:${location.line + 1}.`,
        },
      }),
    );
  }

  const uniqueFindings = deduplicate(fileFindings);
  if (uniqueFindings.length > 0) {
    const release = acquireLock(REPORT_STATE_KEY);
    try {
      const accumulated = getState<MigrationFinding[]>(REPORT_STATE_KEY) ?? [];
      setState(REPORT_STATE_KEY, [...accumulated, ...uniqueFindings]);
    } finally {
      release();
    }

    for (const item of uniqueFindings) {
      findingMetric.increment({
        file: item.location.file,
        route: item.route,
        ruleId: item.ruleId,
      });
      console.warn(
        `[solid-v2-analysis] ${item.ruleId} ${item.location.file}:${item.location.line}:${item.location.column} ${item.route}`,
      );
    }
  }

  return null;
};

function directOneArgumentCreateEffectCalls(rootNode: SgNode<TSX>): SgNode<TSX>[] {
  const calls = new Map<number, SgNode<TSX>>();

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== "solid-js") continue;

    for (const specifier of statement.findAll({
      rule: { kind: "import_specifier" },
    })) {
      if (specifier.text().trim() !== "createEffect") continue;
      const identifiers = specifier.findAll({ rule: { kind: "identifier" } });
      const binding = identifiers[0];
      if (!binding || identifiers.length !== 1) continue;

      for (const fileReferences of binding.references()) {
        for (const reference of fileReferences.nodes) {
          const call = reference.parent();
          if (!call || call.kind() !== "call_expression") continue;
          if (call.field("function")?.id() !== reference.id()) continue;
          const argumentsNode = call.field("arguments");
          if (!argumentsNode) continue;
          const argumentsList = argumentsNode
            .children()
            .filter((child) => child.isNamed());
          if (argumentsList.length !== 1) continue;
          calls.set(call.id(), call);
        }
      }
    }
  }

  return [...calls.values()];
}

function finding(input: {
  filename: string;
  node: SgNode<TSX>;
  ruleId: RuleId;
  title: string;
  route: MigrationFinding["route"];
  source: string;
  reason: string;
  evidence: MigrationFinding["evidence"];
  nextAction: MigrationFinding["nextAction"];
}): MigrationFinding {
  const range = input.node.range();
  const line = range.start.line + 1;
  const column = range.start.column + 1;

  return {
    id: `${input.ruleId}:${input.filename}:${line}:${column}`,
    ruleId: input.ruleId,
    title: input.title,
    route: input.route,
    confidence: "high",
    location: {
      file: input.filename,
      line,
      column,
      endLine: range.end.line + 1,
      endColumn: range.end.column + 1,
    },
    excerpt: sourceExcerpt(input.source, range.start.line, range.end.line),
    reason: input.reason,
    evidence: input.evidence,
    nextAction: input.nextAction,
  };
}

function sourceExcerpt(
  source: string,
  startLineIndex: number,
  endLineIndex: number,
): MigrationFinding["excerpt"] {
  const lines = source.split(/\r?\n/);
  const first = Math.max(0, startLineIndex - 1);
  const last = Math.min(lines.length, Math.max(endLineIndex + 2, first + 1));
  const boundedLast = Math.min(last, first + 5);
  return {
    startLine: first + 1,
    text: lines.slice(first, boundedLast).join("\n"),
  };
}

function deduplicate(findings: MigrationFinding[]): MigrationFinding[] {
  return [...new Map(findings.map((item) => [item.id, item])).values()];
}

export default analyze;
