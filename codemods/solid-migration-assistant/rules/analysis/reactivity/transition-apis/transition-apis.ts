import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls } from "../../../../shared/analysis.ts";

const GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md";

function transitionGuidance(
  name: string,
  call: SgNode<TSX>,
  filename: string,
): string {
  const start = call.range().start;
  const reasons: Record<string, string> = {
    startTransition:
      "Solid 2 removes startTransition; use built-in transition batching with isPending() to observe in-flight state.",
    useTransition:
      "Solid 2 removes useTransition; use isPending() and Loading boundaries to track transition state.",
    createDeferred:
      "Solid 2 removes createDeferred; use standard reactive derivations — values update automatically after flush.",
  };
  const steps: Record<string, string> = {
    startTransition:
      "Remove the startTransition wrapper. The callback's writes are batched automatically. Add isPending() checks where the caller previously observed the pending boolean.",
    useTransition:
      "Replace useTransition() with isPending(fn) at each site that previously read the pending flag. Wrap the JSX with Loading boundaries for in-flight fallback UI.",
    createDeferred:
      "Remove createDeferred. The value now updates automatically after the microtask flush — replace consumers of the deferred signal with direct reads of the source.",
  };
  return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this ${name} call to Solid 2 built-in transitions.
Why: ${reasons[name]}
Guidance: ${steps[name]} Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${GUIDE}#async-data--transitions`;
}

export function analyzeStartTransition(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "startTransition")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) =>
      transitionGuidance("startTransition", call, filename),
    );
}

export function analyzeUseTransition(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "useTransition")
    .filter(({ argumentNodes }) => argumentNodes.length === 0)
    .map(({ call, filename }) =>
      transitionGuidance("useTransition", call, filename),
    );
}

export function analyzeCreateDeferred(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "createDeferred")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length >= 1 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, filename }) =>
      transitionGuidance("createDeferred", call, filename),
    );
}
