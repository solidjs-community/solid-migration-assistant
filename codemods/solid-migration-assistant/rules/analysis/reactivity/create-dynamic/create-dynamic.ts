import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { findImportedCalls } from "../../../../shared/analysis.ts";

const GUIDE = "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md";

export function analyzeCreateDynamic(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedCalls(rootNode, "solid-js/web", "createDynamic")
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
