import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { sourceSnippet, stringLiteralValue } from "../../../../shared/analysis.ts";
import type { AnalysisRuleResult } from "../../../../shared/report.ts";
import { formatComponentRenameGuidance, type ComponentRenameContent, type ComponentRenameFinding, type ComponentRenamesReport } from "./report.ts";

const SUSPENSE_BOUNDARY_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#suspense--errorboundary--loading--errored";
const INDEX_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#list-rendering-index-is-gone-and-for-handles-each-keying-mode";
const SUSPENSE_LIST_GUIDE =
  "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#coordinating-loading-boundaries-suspenselist--reveal";

const COMPONENT_MIGRATIONS = {
  Suspense: "Loading",
  ErrorBoundary: "Errored",
  SuspenseList: "Reveal",
  Index: "For",
} as const;

type LegacyComponent = keyof typeof COMPONENT_MIGRATIONS;

type ComponentSite = {
  element: SgNode<TSX>;
  filename: string;
  legacyName: LegacyComponent;
};

export function analyzeJsxComponentRenames(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): AnalysisRuleResult<ComponentRenamesReport> {
  const findings = findImportedComponentSites(rootNode)
    .sort((left, right) => {
      const leftStart = left.element.range().start;
      const rightStart = right.element.range().start;
      const filenameOrder = left.filename.localeCompare(right.filename);
      if (filenameOrder !== 0) return filenameOrder;
      if (leftStart.line !== rightStart.line) {
        return leftStart.line - rightStart.line;
      }
      return leftStart.column - rightStart.column;
    })
    .map(({ element, filename, legacyName }): ComponentRenameFinding => {
      const start = element.range().start;
      return {
        filename,
        line: start.line + 1,
        column: start.column + 1,
        legacyName,
        replacement: COMPONENT_MIGRATIONS[legacyName],
        ...componentContent(legacyName),
        snippet: sourceSnippet(element),
      };
    });
  return { guidance: findings.map(formatComponentRenameGuidance), report: { findings } };
}

function findImportedComponentSites(rootNode: SgNode<TSX>): ComponentSite[] {
  const sites = new Map<string, ComponentSite>();

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
        const filename = fileReferences.root
          .relativeFilename()
          .replaceAll("\\", "/");
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
          sites.set(`${filename}:${element.id()}`, {
            element,
            filename,
            legacyName,
          });
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

function componentContent(legacyName: LegacyComponent): ComponentRenameContent {
  const commonValidation = "Make and validate this migration yourself; this analyzer never edits or runs the target project.";
  if (legacyName === "Suspense") return {
    summary: "Manual review required: migrate this imported Suspense JSX site to Loading.",
    reason: "Solid 2 replaces the solid-js Suspense component with Loading for initial not-ready fallback UI.",
    nextSteps: [
      "Read this complete boundary, its fallback, children, props, and corresponding import.",
      "Replace the unaliased named Suspense import and this JSX component with Loading only after confirming that the boundary owns initial not-ready UI and that its fallback and children preserve their rendering behavior.",
      commonValidation,
    ],
    cautions: ["Stop without proposing a rewrite when props are spread or forwarded, fallback ownership or evaluation is indirect, nested async boundaries make the intended initial-loading behavior unclear, or focused rendering tests do not cover the fallback and ready states."],
    validation: ["Ask for the smallest focused test or runtime observation that exposes both states."],
    officialGuideUrl: SUSPENSE_BOUNDARY_GUIDE,
  };
  if (legacyName === "ErrorBoundary") return {
    summary: "Manual review required: migrate this imported ErrorBoundary JSX site to Errored.",
    reason: "Solid 2 replaces the solid-js ErrorBoundary component with Errored, whose fallback receives an error accessor rather than a raw error value.",
    nextSteps: [
      "Read this complete boundary, its fallback, children, props, and corresponding import.",
      "Replace the unaliased named ErrorBoundary import and this JSX component with Errored only after updating every fallback use to read the error accessor, such as err(), while preserving error ownership and recovery behavior.",
      commonValidation,
    ],
    cautions: ["Stop without proposing a rewrite when props are spread or forwarded, the fallback is indirect or escapes, the error value is passed to unknown code, reset or recovery behavior is unclear, or focused tests do not cover thrown and recovered states."],
    validation: ["Ask for the smallest focused test or runtime observation that exposes the fallback value and recovery behavior."],
    officialGuideUrl: SUSPENSE_BOUNDARY_GUIDE,
  };
  if (legacyName === "Index") return {
    summary: "Manual review required: migrate this imported Index JSX site to For keyed={false}.",
    reason: "Solid 2 removes Index; its direct replacement is For with keyed={false}, whose child callback receives an item accessor and a stable numeric index.",
    nextSteps: [
      "Read the complete list site, its each value, child callback, props, and corresponding import.",
      "Replace the unaliased named Index import and this JSX component with For, add the literal keyed={false} mode, and review the callback so the item remains an accessor and the index remains a stable number.",
      commonValidation,
    ],
    cautions: ["Stop without proposing a rewrite when props are spread or forwarded, each or the child callback is indirect, callback parameters escape to unknown code, item identity or index behavior is unclear, or focused list-update tests do not prove state preservation."],
    validation: ["Ask for the smallest focused test or runtime observation that covers insertion, removal, reordering, and item updates."],
    officialGuideUrl: INDEX_GUIDE,
  };
  return {
    summary: "Manual review required: migrate this imported SuspenseList JSX site to Reveal.",
    reason: "Solid 2 replaces SuspenseList with Reveal for coordinating sibling Loading boundaries and replaces revealOrder and tail controls with order and collapsed semantics.",
    nextSteps: [
      "Read the complete group, its revealOrder and tail values, children, nesting, props, and corresponding import.",
      'Replace the unaliased named SuspenseList import and this JSX component with Reveal only after mapping literal revealOrder="forwards" to the default or order="sequential", revealOrder="together" to order="together", and tail="collapsed" to collapsed only under sequential order; review the children as sibling Loading boundaries, and do not use the earlier-beta boolean together prop.',
      commonValidation,
    ],
    cautions: ["Stop without proposing a rewrite when props are spread or forwarded, revealOrder or tail is dynamic or has another value, child boundary ownership or nesting is unclear, intended reveal timing cannot be established, or focused behavior tests do not cover the coordinated states."],
    validation: ["Ask for the smallest focused test or runtime observation that exposes ordering, fallback, and collapsed-tail behavior."],
    officialGuideUrl: SUSPENSE_LIST_GUIDE,
  };
}
