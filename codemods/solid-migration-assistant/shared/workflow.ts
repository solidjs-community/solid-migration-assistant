import { guard } from "@codemod.com/orchestration";

/**
 * Workflow-side helpers: the definition applicability every command shares,
 * the schema of one command's structured output, and the report aggregation
 * the workflow bodies apply. This module runs in the workflow process only;
 * nothing here is bundled into a transform artifact.
 */

/** Project-owned JavaScript and TypeScript source, relative to the target root. */
export const SOURCE_INCLUDE: string[] = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx"];

export const SOURCE_EXCLUDE: string[] = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.d.ts",
];

/**
 * One command's output: for every file whose transform produced a result,
 * in the executor's deterministic file order, the strings that file produced.
 */
export const FileStrings = guard(
  "string[][]",
  (value: unknown): value is string[][] =>
    Array.isArray(value) &&
    value.every(
      (entry) =>
        Array.isArray(entry) && entry.every((item) => typeof item === "string"),
    ),
);

/**
 * Flatten every command's per-file strings, exact-deduplicate them, and sort
 * them lexically as whole strings. This is the deterministic order the
 * launcher prints; it replaces the shared-state accumulation the YAML
 * workflows used.
 */
export function aggregateReport(commands: readonly string[][][]): string[] {
  const unique = new Set<string>();
  for (const files of commands) {
    for (const strings of files) {
      for (const entry of strings) unique.add(entry);
    }
  }
  return [...unique].sort();
}
