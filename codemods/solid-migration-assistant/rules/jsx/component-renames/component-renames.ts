import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { siteGuidance, stringLiteralValue } from "../../../shared/analysis.ts";

const RULE_ID = "S2-JSX-COMPONENT-001";

const COMPONENT_MIGRATIONS = {
  Suspense: "Loading",
  ErrorBoundary: "Errored",
  SuspenseList: "Reveal",
  Index: "For",
} as const;

type LegacyComponent = keyof typeof COMPONENT_MIGRATIONS;

type ComponentSite = {
  element: SgNode<TSX>;
  legacyName: LegacyComponent;
};

export function analyzeJsxComponentRenames(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findImportedComponentSites(rootNode)
    .sort(compareSites)
    .map(({ element, legacyName }) =>
      componentGuidance(element, context.filename, legacyName),
    );
}

function findImportedComponentSites(rootNode: SgNode<TSX>): ComponentSite[] {
  const sites = new Map<number, ComponentSite>();

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const source = statement.children().find((child) => child.is("string"));
    if (!source || stringLiteralValue(source) !== "solid-js") continue;

    for (const specifier of statement.findAll({
      rule: { kind: "import_specifier" },
    })) {
      const legacyName = importedLegacyName(specifier);
      if (!legacyName) continue;

      const identifiers = specifier.findAll({ rule: { kind: "identifier" } });
      const binding = identifiers[0];
      if (!binding || identifiers.length !== 1) continue;

      for (const fileReferences of binding.references()) {
        for (const reference of fileReferences.nodes) {
          const element = reference.parent();
          if (
            !element ||
            (element.kind() !== "jsx_opening_element" &&
              element.kind() !== "jsx_self_closing_element") ||
            element.field("name")?.id() !== reference.id()
          ) {
            continue;
          }
          sites.set(element.id(), { element, legacyName });
        }
      }
    }
  }

  return [...sites.values()];
}

function importedLegacyName(specifier: SgNode<TSX>): LegacyComponent | null {
  const text = specifier.text().trim();
  return text in COMPONENT_MIGRATIONS ? (text as LegacyComponent) : null;
}

function componentGuidance(
  element: SgNode<TSX>,
  filename: string,
  legacyName: LegacyComponent,
): string {
  const replacement = COMPONENT_MIGRATIONS[legacyName];

  if (legacyName === "SuspenseList") {
    return siteGuidance(
      element,
      filename,
      RULE_ID,
      `Migrate this imported ${legacyName} JSX site to ${replacement}.`,
      `Solid 2 renames the imported solid-js ${legacyName} component to ${replacement} and changes the reveal-control prop names.`,
      `Review this site's revealOrder and tail values while migrating them to Reveal's order and collapsed props, then replace this JSX use with ${replacement}. This analyzer does not edit source. Stop if either prop is dynamic, forwarded, spread, or its intended reveal behavior is unclear; preserve the site and add a focused behavior test before changing it.`,
    );
  }

  if (legacyName === "Index") {
    return siteGuidance(
      element,
      filename,
      RULE_ID,
      `Migrate this imported ${legacyName} JSX site to ${replacement}.`,
      `Solid 2 replaces the imported solid-js ${legacyName} component with ${replacement} configured for non-keyed iteration.`,
      `Replace this JSX use with ${replacement} keyed={false}, and review the child callback shape, including whether the item and index are accessors, before adapting it. This analyzer does not edit source. Stop if callback shape, item identity, index behavior, or state preservation is unclear; keep the site unchanged and add a focused list-update test first.`,
    );
  }

  return siteGuidance(
    element,
    filename,
    RULE_ID,
    `Migrate this imported ${legacyName} JSX site to ${replacement}.`,
    `Solid 2 renames the imported solid-js ${legacyName} component to ${replacement}.`,
    `Replace only this binding-aware JSX use with ${replacement}, review its props and children against the new component contract, and update the corresponding unaliased named import separately. This analyzer does not edit source. Stop if props are spread or forwarded, fallback or error behavior is indirect, or the component contract cannot be verified; keep the site unchanged and add a focused rendering test first.`,
  );
}

function compareSites(left: ComponentSite, right: ComponentSite): number {
  const leftStart = left.element.range().start;
  const rightStart = right.element.range().start;
  return (
    leftStart.line - rightStart.line || leftStart.column - rightStart.column
  );
}
