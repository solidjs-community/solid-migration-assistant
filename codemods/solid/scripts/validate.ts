import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

interface ValidationRule {
  code: string;
  message: string;
  pattern: RegExp;
}

const REMOVED_SOLID_EXPORTS = new Set([
  "ErrorBoundary",
  "Index",
  "Suspense",
  "batch",
  "catchError",
  "createComputed",
  "createResource",
  "createSelector",
  "getListener",
  "mergeProps",
  "onMount",
  "on",
  "resetErrorBoundaries",
  "splitProps",
  "startTransition",
  "useTransition",
]);

const RULES: ValidationRule[] = [
  {
    code: "S2-VALIDATE-001",
    message: "manual migration blockers remain",
    pattern: /TODO\(solid-2 S2-BLOCKER-/,
  },
  {
    code: "S2-VALIDATE-002",
    message: "an unsupported createEffect still needs to be split",
    pattern: /TODO\(solid-2 S2-EFFECT-001\)/,
  },
  {
    code: "S2-VALIDATE-003",
    message: "the removed solid-js/store module is still imported",
    pattern: /\bfrom\s*["']solid-js\/store["']|\bimport\s*["']solid-js\/store["']/,
  },
  {
    code: "S2-VALIDATE-004",
    message: "a legacy Index component remains",
    pattern: /<\/?Index\b/,
  },
  {
    code: "S2-VALIDATE-005",
    message: "an intrinsic element still uses classList",
    pattern: /<[a-z][\w:-]*\b[^>]*\bclassList\s*=/,
  },
  {
    code: "S2-VALIDATE-006",
    message: "an intrinsic element still uses a legacy use: directive",
    pattern: /<[a-z][\w:-]*\b[^>]*\buse:[A-Za-z_$][\w$-]*/,
  },
  {
    code: "S2-VALIDATE-007",
    message: "an omit call still uses the removed splitProps tuple destructuring shape",
    pattern: /const\s*\[\s*,\s*[A-Za-z_$][\w$]*\s*\]\s*=\s*omit\s*\(/,
  },
];

/** Returns local import names for one Solid export without treating unrelated modules as evidence. */
function importedLocals(source: string, exported: string): string[] {
  const locals: string[] = [];
  const pattern = /import\s*\{([\s\S]*?)\}\s*from\s*["']solid-js["']/g;
  for (const declaration of source.matchAll(pattern)) {
    for (const raw of declaration[1].split(",")) {
      const specifier = raw.trim().replace(/^type\s+/, "");
      const [name, local = name] = specifier.split(/\s+as\s+/);
      if (name === exported) locals.push(local);
    }
  }
  return locals;
}

/** Finds the first removed Solid 1 export that survived the transform. */
function residualRemovedExport(source: string): string | null {
  for (const exported of REMOVED_SOLID_EXPORTS) {
    if (importedLocals(source, exported).length > 0) return exported;
  }
  return null;
}

/** Finds a `.Provider` tag only for bindings proven to be created by imported createContext. */
function residualContextProvider(source: string): string | null {
  for (const createContext of importedLocals(source, "createContext")) {
    const declaration = new RegExp(
      `\\b(?:const|let)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${createContext}(?:\\s*<[^;=]+?>)?\\s*\\(`,
      "g",
    );
    for (const match of source.matchAll(declaration)) {
      if (new RegExp(`<\\/?${match[1]}\\.Provider\\b`).test(source)) return match[1];
    }
  }
  return null;
}

const codemod: Codemod<TSX> = async (root) => {
  const source = root.root().text();
  const failure = RULES.find((rule) => rule.pattern.test(source));
  if (failure) {
    throw new Error(`${failure.code}: ${failure.message}`);
  }
  const removedExport = residualRemovedExport(source);
  if (removedExport) {
    throw new Error(`S2-VALIDATE-008: removed Solid 1 export "${removedExport}" is still imported`);
  }
  const context = residualContextProvider(source);
  if (context) {
    throw new Error(`S2-VALIDATE-009: legacy context provider "${context}.Provider" remains`);
  }
  const unresolvedProvider = source.match(/<\/?([A-Z][A-Za-z0-9_$]*)\.Provider\b/)?.[1];
  if (unresolvedProvider) {
    // Per-file validation cannot prove a cross-file binding came from createContext. Fail closed
    // without rewriting it; repository discovery can later replace this conservative gate.
    throw new Error(
      `S2-VALIDATE-010: unresolved provider form "${unresolvedProvider}.Provider" requires cross-file context review`,
    );
  }
  return null;
};

export default codemod;
