import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const MIGRATION_GUIDE = "https://github.com/solidjs/solid/blob/4816a4ff426be8b08b9e8796039306f153d203de/documentation/solid-2.0/MIGRATION.md#context-providers-contextprovider--context-is-the-provider";

export function analyzeContextProvider(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  const findings: string[] = [];
  for (const elementKind of ["jsx_opening_element", "jsx_self_closing_element"] as const) {
    for (const element of rootNode.findAll({ rule: { kind: elementKind } })) {
      const nameField = element.field("name");
      if (!nameField || nameField.kind() !== "member_expression") continue;
      const property = nameField.children().find(
        (child) => child.kind() === "property_identifier",
      );
      if (!property || property.text() !== "Provider") continue;
      const object = nameField.children().find(
        (child) => child.kind() === "identifier",
      );
      if (!object) continue;
      const start = element.range().start;
      const contextName = object.text();
      findings.push(
        `${context.filename}:${start.line + 1}:${start.column + 1} Manual review required: migrate this Context.Provider JSX site to direct context provider syntax.
Why: Solid 2 removes the Context.Provider pattern; use the context value directly as a JSX component: <${contextName} value={...}>.
Guidance: Replace <${contextName}.Provider value={...}> with <${contextName} value={...}>. Remove the .Provider suffix — the context itself is now the provider component. The value prop and children remain unchanged. Make and validate that edit yourself; this analyzer never edits or runs the target project. Official migration guide: ${MIGRATION_GUIDE}`,
      );
    }
  }
  return findings;
}
