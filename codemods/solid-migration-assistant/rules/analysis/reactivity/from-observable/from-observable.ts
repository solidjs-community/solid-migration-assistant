import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls } from "../../../../shared/analysis.ts";

const GUIDE = "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md";

export function analyzeFrom(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "from")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this from call to async iterators or effects.
Why: Solid 2 removes from (observable-to-signal bridge); use async iterators for observable interop.
Guidance: Read the observable argument and every consumer of the returned signal. Replace with an async iterator pattern or a createEffect that subscribes and sets a local signal. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${GUIDE}#detailed-removal-guide`;
    });
}

export function analyzeObservable(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, ["solid-js", "solid-js/web"], "observable")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 1 &&
        argumentNodes[0]?.kind() !== "spread_element",
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this observable call to async iterators or effects.
Why: Solid 2 removes observable (signal-to-observable bridge); use async iterators for observable interop.
Guidance: Read the signal argument and every subscriber to the returned observable. Replace with an async iterator or effect-based pattern. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${GUIDE}#detailed-removal-guide`;
    });
}
