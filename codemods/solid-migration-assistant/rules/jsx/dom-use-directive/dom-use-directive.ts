import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const MIGRATION_GUIDE = "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#directives-use--ref-directive-factories-two-phase-pattern";

export function analyzeDomUseDirective(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  const findings: string[] = [];
  for (const elementKind of ["jsx_opening_element", "jsx_self_closing_element"] as const) {
    for (const element of rootNode.findAll({ rule: { kind: elementKind } })) {
      for (const attribute of element
        .children()
        .filter((child) => child.kind() === "jsx_attribute")) {
        const nameNode = attribute
          .children()
          .find((child) => child.kind() === "jsx_namespace_name");
        if (!nameNode) continue;
        const name = nameNode.text();
        if (!name.startsWith("use:")) continue;
        const start = nameNode.range().start;
        const directiveName = name.slice(4);
        findings.push(
          `${context.filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this use: directive to a ref directive factory.
Why: Solid 2 removes use: directives; custom element behaviors use ref directive factories with a two-phase pattern (create + effect).
Guidance: Replace use:${directiveName} with ref={${directiveName}}. The directive must be rewritten as a ref directive factory: a function that returns a tuple of [create, effect] callbacks. Read the directive's source, identify its element setup and teardown logic, and port them to the factory pattern. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${MIGRATION_GUIDE}`,
        );
      }
    }
  }
  return findings;
}
