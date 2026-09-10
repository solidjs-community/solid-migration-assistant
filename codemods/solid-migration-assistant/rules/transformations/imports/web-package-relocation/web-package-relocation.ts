import type { Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { stringLiteralValue } from "../../../../shared/analysis.ts";

/**
 * The upstream Solid `next` commit whose worktree was read to build the
 * allowlist below. `packages/web/package.json` is `@solidjs/web`
 * `2.0.0-rc.7` at this commit, and the `v1.9.13` tag in the same repository
 * supplies the legacy `solid-js/web` side of every comparison.
 */
export const SOLID_WEB_SOURCE_COMMIT =
  "7f416cf75dde3b89739d53b15305ac6c3c41355c";

export const WEB_MIGRATION_GUIDE = `https://github.com/solidjs/solid/blob/${SOLID_WEB_SOURCE_COMMIT}/documentation/solid-2.0/MIGRATION.md#imports-where-things-live-now`;

export const LEGACY_WEB_MODULE = "solid-js/web";
export const WEB_RELOCATION_TARGET = "@solidjs/web";

/**
 * `solid-js/web` is *not* a pure package relocation. Unlike the five subpaths
 * handled by legacy-subpath-relocation, the web entry's export surface changed
 * between Solid 1.9.13 and 2.0.0-rc.7: exports were removed (`createDynamic`,
 * `Index`, `SuspenseList`, `renderToStringAsync`, `ssrClassList`,
 * `pipeToNodeWritable`), renamed (`Suspense` → `Loading`, `ErrorBoundary` →
 * `Errored`, `mergeProps` → `merge`), or behaviorally changed (`Portal` lost
 * `useShadow`, `isSVG`, and `ref`; `isDev` is no longer hard-coded to `false`
 * on the server entry).
 *
 * So the module string alone never justifies a rewrite. This rule is
 * default-deny: it moves a statement only when *every* name that statement
 * imports from the module is on this allowlist, and each entry here is a name
 * that upstream proves is the same API before and after the move:
 *
 * - `render`, `hydrate` — `documentation/solid-2.0/MIGRATION.md` opens the
 *   "Imports: where things live now" section by relocating exactly this pair
 *   from `solid-js/web` to `@solidjs/web` with the import unchanged.
 *   Both are declared in `packages/web/src/client.ts` at rc.7 and re-exported
 *   from the web entry, keeping their 1.9 shapes:
 *   `render(code, element, init?, options?) => () => void` and
 *   `hydrate(code, element, options?) => () => void`.
 * - `isServer` — declared identically on all four entries: `false` in
 *   `packages/(solid/)web/src/index.ts` and `true` in the server entry, on
 *   both 1.9.13 and rc.7.
 *
 * `Dynamic` is deliberately **not** on this list, and its exclusion states the
 * evidence bar the list holds to. Upstream prose and compiler configuration
 * both point at it: `documentation/solid-2.0/MIGRATION.md` says
 * `<Dynamic component={...}>` "still exists and is user-facing unchanged" and
 * shows `import { Dynamic } from "@solidjs/web"` as the 2.0 form, and
 * `packages/babel-plugin/src/config.ts` auto-imports `Dynamic` from its
 * default `moduleName` of `@solidjs/web`. But no `Dynamic` export exists: the
 * identifier does not appear anywhere under `packages/` at rc.7. A guide
 * describes the intended end state and a compiler config describes what the
 * compiler expects to exist; neither is a binding that can be proven
 * compatible, which is what this list promises. Rewriting an import to a name
 * the target package does not export would break the build it claims to
 * migrate, so `Dynamic` stays vetoed until an actual exported implementation
 * lands, at which point it can be added against a located export site.
 *
 * Everything else — including `Dynamic`, `Portal`, `isDev`, `renderToString`,
 * `renderToStream`, `generateHydrationScript`, `getRequestEvent`, `For`,
 * `Show`, `Switch`, `Match`, `NoHydration`, `template`, `insert`, `spread`,
 * and `default` — is vetoed. Some of those names are genuinely gone or
 * changed; the rest are simply not proven here, and an unproven name must
 * block the move rather than ride along with a proven one. The read-only
 * web-import analyzer (`rules/analysis/imports/web-import/`) is unchanged and
 * still reports every statement this rule refuses, `Dynamic` included.
 */
export const PROVEN_WEB_BINDINGS: ReadonlySet<string> = new Set([
  "hydrate",
  "isServer",
  "render",
]);

export type WebPackageRelocation = {
  edit: Edit;
  report: string;
};

/**
 * The only child kinds a relocatable statement may contain. Anything else —
 * `import_attribute` (`with { type: "json" }`), the `*` of `export *`, a
 * `namespace_export`, the `default` keyword of `export default "solid-js/web"`
 * — means the statement is a shape this rule has not reasoned about, so it is
 * left alone. `comment` is allowed because an interleaved comment cannot
 * change which bindings a statement introduces.
 */
const ALLOWED_IMPORT_CHILD_KINDS = new Set([
  "import",
  "type",
  "import_clause",
  "from",
  "string",
  ";",
  "comment",
]);

const ALLOWED_EXPORT_CHILD_KINDS = new Set([
  "export",
  "type",
  "export_clause",
  "from",
  "string",
  ";",
  "comment",
]);

/**
 * Returns the `named_imports` node of a statement whose entire import clause
 * is a single braced name list. Default imports (`import def, { ... }`),
 * namespace imports (`import * as web`), and side-effect imports
 * (`import "solid-js/web"`, which has no clause at all) all return null: none
 * of them names the bindings it introduces, so none can be proven safe.
 */
function namedImportsOf(statement: SgNode<TSX>): SgNode<TSX> | null {
  let clause: SgNode<TSX> | null = null;
  for (const child of statement.children()) {
    if (!ALLOWED_IMPORT_CHILD_KINDS.has(child.kind())) return null;
    if (child.kind() !== "import_clause") continue;
    if (clause !== null) return null;
    clause = child;
  }
  if (clause === null) return null;

  let named: SgNode<TSX> | null = null;
  for (const child of clause.children()) {
    if (!child.isNamed() || child.kind() === "comment") continue;
    if (child.kind() !== "named_imports") return null;
    if (named !== null) return null;
    named = child;
  }
  return named;
}

/**
 * Returns the `export_clause` of a braced re-export. A statement without a
 * `from` keyword is a local export whose string child, if any, is a value
 * rather than a module reference, and `export * from` / `export * as ns from`
 * re-export names this rule cannot enumerate.
 */
function exportClauseOf(statement: SgNode<TSX>): SgNode<TSX> | null {
  let clause: SgNode<TSX> | null = null;
  let hasFrom = false;
  for (const child of statement.children()) {
    if (!ALLOWED_EXPORT_CHILD_KINDS.has(child.kind())) return null;
    if (child.kind() === "from") hasFrom = true;
    if (child.kind() !== "export_clause") continue;
    if (clause !== null) return null;
    clause = child;
  }
  return hasFrom ? clause : null;
}

/**
 * Collects the source names a braced clause pulls out of the module, in
 * source order and deduplicated, or null when the clause names anything that
 * is not a proven binding. A specifier whose source name is a string literal
 * (`export { "render" as r } from ...`) is rejected rather than decoded: this
 * rule proves identifiers, and an arbitrary-string export name is a shape it
 * has not reasoned about.
 */
function provenBindings(
  clause: SgNode<TSX>,
  specifierKind: "import_specifier" | "export_specifier",
): string[] | null {
  const names: string[] = [];
  for (const child of clause.children()) {
    if (!child.isNamed() || child.kind() === "comment") continue;
    if (child.kind() !== specifierKind) return null;
    const name = child.field("name");
    if (name === null || name.kind() !== "identifier") return null;
    const text = name.text();
    if (!PROVEN_WEB_BINDINGS.has(text)) return null;
    if (!names.includes(text)) names.push(text);
  }
  return names.length > 0 ? names : null;
}

/**
 * Returns the statement's module source when it resolves to exactly
 * `solid-js/web`. The comparison is on the decoded string value, so
 * `"solid-js\x2fweb"` is the same specifier as `"solid-js/web"` and is
 * eligible, while `"solid-js/web/storage"` and `"vendor/solid-js/web"` are
 * different modules and are not.
 */
function legacyWebSource(statement: SgNode<TSX>): SgNode<TSX> | null {
  const source = statement.children().find((child) => child.is("string"));
  if (!source) return null;
  if (stringLiteralValue(source) !== LEGACY_WEB_MODULE) return null;
  return source;
}

function relocation(
  source: SgNode<TSX>,
  names: readonly string[],
  filename: string,
): WebPackageRelocation {
  const start = source.range().start;
  const quote = source.text()[0];
  return {
    edit: source.replace(`${quote}${WEB_RELOCATION_TARGET}${quote}`),
    report: `${filename}:${start.line + 1}:${start.column + 1} Relocate ${LEGACY_WEB_MODULE} to ${WEB_RELOCATION_TARGET} for proven bindings ${names.join(", ")}. Official migration guide: ${WEB_MIGRATION_GUIDE}`,
  };
}

/**
 * Maps every `solid-js/web` statement in `rootNode` whose complete named
 * binding set is proven compatible to a deterministic edit plus a
 * human-readable per-edit report. Only the module string is rewritten, so
 * aliases, inline `type` modifiers, and quote style survive untouched, and a
 * second run finds nothing because `@solidjs/web` is not the legacy
 * specifier. The caller commits the edits; this rule performs no I/O.
 */
export function relocateWebPackage(
  rootNode: SgNode<TSX>,
  filename: string,
): WebPackageRelocation[] {
  const relocations: { source: SgNode<TSX>; entry: WebPackageRelocation }[] = [];

  for (const statement of rootNode.findAll({
    rule: { kind: "import_statement" },
  })) {
    const clause = namedImportsOf(statement);
    if (clause === null) continue;
    const source = legacyWebSource(statement);
    if (source === null) continue;
    const names = provenBindings(clause, "import_specifier");
    if (names === null) continue;
    relocations.push({ source, entry: relocation(source, names, filename) });
  }

  for (const statement of rootNode.findAll({
    rule: { kind: "export_statement" },
  })) {
    const clause = exportClauseOf(statement);
    if (clause === null) continue;
    const source = legacyWebSource(statement);
    if (source === null) continue;
    const names = provenBindings(clause, "export_specifier");
    if (names === null) continue;
    relocations.push({ source, entry: relocation(source, names, filename) });
  }

  // Imports and re-exports are collected in separate passes, so sort the
  // combined result back into source order to keep edits and report lines
  // deterministic regardless of how the two forms interleave in the file.
  return relocations
    .sort((left, right) => left.source.range().start.index - right.source.range().start.index)
    .map(({ entry }) => entry);
}
