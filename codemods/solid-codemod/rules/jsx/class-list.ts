import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { siteGuidance } from "../../shared/analysis.ts";

const RULE_ID = "S2-JSX-CLASSLIST-001";

export function analyzeJsxClassListAttributes(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findClassListAttributeNames(rootNode).map((name) =>
    siteGuidance(
      name,
      context.filename,
      RULE_ID,
      "Migrate this JSX classList attribute to class object/array form.",
      "Solid 2 removes the JSX classList attribute in favor of the class attribute's object and array forms.",
      "Move this classList value into a class object/array form, preserve static classes and conditional truthiness, and deliberately merge any existing class attribute on the same element. This analyzer does not edit source. Stop if the value is spread or forwarded, duplicate class sources have unclear precedence, or getter and side-effect evaluation could change; keep the attribute unchanged and add a focused rendering test first.",
    ),
  );
}

function findClassListAttributeNames(rootNode: SgNode<TSX>): SgNode<TSX>[] {
  const names: SgNode<TSX>[] = [];

  for (const elementKind of [
    "jsx_opening_element",
    "jsx_self_closing_element",
  ] as const) {
    for (const element of rootNode.findAll({ rule: { kind: elementKind } })) {
      if (!isIntrinsicElement(element)) continue;

      for (const attribute of element
        .children()
        .filter((child) => child.kind() === "jsx_attribute")) {
        const name = attribute
          .children()
          .find((child) => child.kind() === "property_identifier");
        if (name?.text() === "classList") names.push(name);
      }
    }
  }

  return names.sort((left, right) => {
    const leftStart = left.range().start;
    const rightStart = right.range().start;
    return (
      leftStart.line - rightStart.line || leftStart.column - rightStart.column
    );
  });
}

function isIntrinsicElement(element: SgNode<TSX>): boolean {
  const name = element.field("name");
  return (
    name?.kind() === "identifier" && /^[a-z][A-Za-z0-9-]*$/.test(name.text())
  );
}
