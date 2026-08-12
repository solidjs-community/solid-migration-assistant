import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findDirectImportedCalls } from "../../../shared/analysis.ts";

const GUIDE = "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md";

export function analyzeCreateDynamic(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js/web", "createDynamic")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length >= 1 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, filename }) => {
      const start = call.range().start;
      return `${filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this createDynamic call to the dynamic(source) factory.
Why: Solid 2 replaces createDynamic(component, props) with the dynamic(source) factory that returns a stable component driven by a reactive source.
Guidance: Read the complete component and props arguments. Replace createDynamic(Component, props) with dynamic(() => Component)(props). The factory returns a stable component — extract it to module scope if the source does not change per render. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${GUIDE}#detailed-removal-guide`;
    });
}

export function analyzeFrom(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, "solid-js", "from")
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
  return findDirectImportedCalls(rootNode, "solid-js", "observable")
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
