import type { Codemod, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

const EFFECT_TODO =
  "// TODO(solid-2 S2-EFFECT-001): Split this unsupported one-argument createEffect into compute and apply phases.";
/** Builds the stable manual-migration marker emitted for a still-used removed store API. */
const STORE_BLOCKER = (name: string) =>
  `// TODO(solid-2 S2-BLOCKER-STORE-001): Unsupported removed store API "${name}"; manual migration required.`;
const PROPS_BLOCKER =
  "// TODO(solid-2 S2-BLOCKER-PROPS-001): splitProps selected bindings or dynamic key groups require semantic review.";
const LIFECYCLE_BLOCKER =
  "// TODO(solid-2 S2-BLOCKER-LIFECYCLE-001): onMount cleanup shape requires control-flow review.";
const DIRECTIVE_BLOCKER =
  "// TODO(solid-2 S2-BLOCKER-DIRECTIVE-001): Directive definition and call sites must migrate together.";
const ASYNC_BLOCKER =
  "// TODO(solid-2 S2-BLOCKER-ASYNC-001): Async API usage requires algorithm and scheduling review.";

const RELEVANT_MODULES = new Set(["solid-js", "solid-js/store", "@solidjs/web"]);
const REMOVED_STORE_EXPORTS = new Set(["produce", "unwrap", "createMutable", "modifyMutable"]);

interface TransformFlags {
  deep: boolean;
  flush: boolean;
  forComponent: boolean;
  isPending: boolean;
  omit: boolean;
  onSettled: boolean;
  snapshot: boolean;
  storePath: boolean;
  untrack: boolean;
  importReplacements: Map<string, string>;
}

interface NamedImport {
  end: number;
  module: string;
  specifiers: string[];
  start: number;
}

/** Returns the exported name from a named-import fragment, ignoring `type` and local aliases. */
function importedName(specifier: string): string {
  return specifier
    .replace(/^type\s+/, "")
    .split(/\s+as\s+/)[0]
    .trim();
}

/** Deduplicates rebuilt import fragments while preserving their original source order. */
function uniqueSpecifiers(specifiers: string[]): string[] {
  const names = new Set<string>();
  return specifiers.filter((specifier) => {
    const key = specifier.trim();
    if (!key || names.has(key)) return false;
    names.add(key);
    return true;
  });
}

/**
 * Locates named imports from modules this codemod owns and records their source ranges.
 * The ranges let the final import pass remove and rebuild only recognized declarations.
 */
function parseNamedImports(source: string): NamedImport[] {
  const imports: NamedImport[] = [];
  const pattern = /import\s*\{([\s\S]*?)\}\s*from\s*(["'])([^"']+)\2[ \t]*;?[ \t]*(?:\r?\n)?/g;

  for (const match of source.matchAll(pattern)) {
    // Ignore unrelated modules: identical export names there do not prove a Solid binding.
    if (!RELEVANT_MODULES.has(match[3]) || match.index === undefined) continue;
    imports.push({
      start: match.index,
      end: match.index + match[0].length,
      module: match[3],
      specifiers: match[1]
        .split(",")
        .map((specifier) => specifier.trim())
        .filter(Boolean),
    });
  }

  return imports;
}

/** Returns the in-file identifier introduced by a named import, including an alias if present. */
function localImportName(specifier: string): string {
  const normalized = specifier.replace(/^type\s+/, "").trim();
  const alias = normalized.match(/\s+as\s+([A-Za-z_$][\w$]*)$/);
  return alias?.[1] ?? normalized;
}

/** Keeps the existing local binding while changing the imported Solid 2 export. */
function importAs(exported: string, local: string): string {
  return exported === local ? exported : `${exported} as ${local}`;
}

/** Chooses a file-wide unused helper name so generated references cannot bind to a local symbol. */
function unusedIdentifier(source: string, preferred: string): string {
  if (!new RegExp(`\\b${escapeRegExp(preferred)}\\b`).test(source)) return preferred;
  let index = 1;
  let candidate = `__solid2${preferred[0].toUpperCase()}${preferred.slice(1)}`;
  while (new RegExp(`\\b${escapeRegExp(candidate)}\\b`).test(source)) {
    index += 1;
    candidate = `__solid2${preferred[0].toUpperCase()}${preferred.slice(1)}${index}`;
  }
  return candidate;
}

/** Escapes an imported identifier before embedding it in a dynamically constructed regex. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Resolves every local alias for one export from one module.
 * Later text rewrites use this import evidence as a lightweight binding/scope guard.
 */
function importedLocalNames(source: string, module: string, imported: string): string[] {
  return parseNamedImports(source)
    .filter((declaration) => declaration.module === module)
    .flatMap((declaration) => declaration.specifiers)
    .filter((specifier) => importedName(specifier) === imported)
    .map(localImportName);
}

/**
 * Scans from a JSX tag start to its structural closing `>`, skipping quoted text
 * and braces so `>` inside an attribute expression is not mistaken for the tag end.
 */
function findJsxTagEnd(source: string, start: number): number {
  let braceDepth = 0;
  let quote = "";
  let escaped = false;

  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") braceDepth += 1;
    else if (char === "}") braceDepth -= 1;
    else if (char === ">" && braceDepth === 0) return index;
  }
  return -1;
}

interface JsxAttributeRange {
  end: number;
  nameEnd: number;
  nameStart: number;
  start: number;
  value: string;
}

/**
 * Finds the delimiter paired with `start` while ignoring delimiters inside strings.
 * Returns -1 for malformed or unsupported source so callers can safely skip the rewrite.
 */
function findBalancedEnd(source: string, start: number, open: string, close: string): number {
  let depth = 0;
  let quote = "";
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === open) depth += 1;
    else if (char === close && --depth === 0) return index;
  }
  return -1;
}

/**
 * Finds a top-level JSX attribute and returns offsets for both its name and full value.
 * Matches nested inside quotes or `{...}` are rejected because they are not attributes.
 */
function findJsxAttribute(opening: string, name: string): JsxAttributeRange | null {
  const pattern = new RegExp(`\\b${name}\\s*=`, "g");
  for (const match of opening.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const before = opening.slice(0, match.index);
    let braceDepth = 0;
    let quote = "";
    let escaped = false;
    for (const char of before) {
      if (quote) {
        if (escaped) escaped = false;
        else if (char === "\\") escaped = true;
        else if (char === quote) quote = "";
      } else if (char === '"' || char === "'") quote = char;
      else if (char === "{") braceDepth += 1;
      else if (char === "}") braceDepth -= 1;
    }
    // A textual match nested in another attribute value is not a JSX attribute node.
    if (quote || braceDepth !== 0) continue;

    const nameStart = match.index;
    const nameEnd = nameStart + name.length;
    let valueStart = nameEnd;
    while (/\s/.test(opening[valueStart] ?? "")) valueStart += 1;
    if (opening[valueStart] !== "=") continue;
    valueStart += 1;
    while (/\s/.test(opening[valueStart] ?? "")) valueStart += 1;
    const first = opening[valueStart];
    let valueEnd = valueStart;
    if (first === "{") valueEnd = findBalancedEnd(opening, valueStart, "{", "}");
    else if (first === '"' || first === "'") {
      valueEnd += 1;
      while (valueEnd < opening.length) {
        if (opening[valueEnd] === first && opening[valueEnd - 1] !== "\\") break;
        valueEnd += 1;
      }
    } else {
      while (valueEnd < opening.length && !/[\s/>]/.test(opening[valueEnd])) valueEnd += 1;
      valueEnd -= 1;
    }
    if (valueEnd < valueStart) continue;
    return {
      start: nameStart,
      end: valueEnd + 1,
      nameStart,
      nameEnd,
      value: opening.slice(valueStart, valueEnd + 1),
    };
  }
  return null;
}

/** Removes one JSX expression-container pair while leaving quoted/literal values intact. */
function unwrapJsxExpression(value: string): string {
  return value.startsWith("{") && value.endsWith("}") ? value.slice(1, -1).trim() : value;
}

/**
 * Converts a JSX attribute value into a JavaScript expression without copying quoted JSX text
 * into executable source. JSX permits literal newlines inside quoted attributes; JavaScript
 * string literals do not, so quoted values are serialized with their newlines escaped.
 */
function jsxAttributeValueExpression(value: string): string | null {
  if (value.startsWith("{") && value.endsWith("}")) return value.slice(1, -1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    const literal = value.slice(1, -1);
    // Entity decoding is renderer-owned. Leave uncommon entity-bearing values for review rather
    // than silently changing their runtime value while moving them into an expression container.
    if (/&(?:#\d+|#x[\da-f]+|[a-z][\w-]*);/i.test(literal)) return null;
    return JSON.stringify(literal);
  }
  return JSON.stringify(value);
}

/**
 * Rewrites `classList` on lowercase intrinsic elements to Solid 2's `class` form.
 * Edits are collected as source ranges and applied backwards to keep offsets stable.
 */
function rewriteDomClassComposition(source: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  // Lowercase tag names classify DOM intrinsics; component `classList` props are preserved.
  const pattern = /<([a-z][\w:-]*)(?=[\s/>])/g;
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const tagEnd = findJsxTagEnd(source, match.index);
    if (tagEnd === -1) continue;
    const opening = source.slice(match.index, tagEnd + 1);
    const classList = findJsxAttribute(opening, "classList");
    if (!classList) continue;
    const classAttribute = findJsxAttribute(opening, "class");
    if (!classAttribute) {
      edits.push({
        start: match.index + classList.nameStart,
        end: match.index + classList.nameEnd,
        text: "class",
      });
      continue;
    }
    const classValue = jsxAttributeValueExpression(classAttribute.value);
    if (classValue === null) continue;
    const classListValue = unwrapJsxExpression(classList.value);
    edits.push({
      start: match.index + classAttribute.start,
      end: match.index + classAttribute.end,
      text: `class={[${classValue}, ${classListValue}]}`,
    });
    let removeStart = match.index + classList.start;
    while (removeStart > match.index && /[ \t]/.test(source[removeStart - 1])) removeStart -= 1;
    edits.push({ start: removeStart, end: match.index + classList.end, text: "" });
  }
  let output = source;
  // Back-to-front replacement prevents an earlier edit from shifting later byte offsets.
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Converts boolean expressions used by enumerated DOM attributes into `"true"`/`"false"`.
 * Already-stringified ternaries are skipped, making the pass idempotent.
 */
function rewriteEnumeratedBooleanAttributes(source: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const pattern = /<([a-z][\w:-]*)(?=[\s/>])/g;
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const tagEnd = findJsxTagEnd(source, match.index);
    if (tagEnd === -1) continue;
    const opening = source.slice(match.index, tagEnd + 1);
    for (const name of ["aria-busy", "data-selected"]) {
      const attribute = findJsxAttribute(opening, name);
      if (!attribute || !attribute.value.startsWith("{")) continue;
      const expression = unwrapJsxExpression(attribute.value);
      // This is the output shape produced by this transform, so do not wrap it again.
      if (/\?\s*["']true["']\s*:\s*["']false["']/.test(expression)) continue;
      const value = expression === "true" || expression === "false"
        ? `"${expression}"`
        : `{${expression} ? "true" : "false"}`;
      edits.push({
        start: match.index + attribute.start,
        end: match.index + attribute.end,
        text: `${name}=${value}`,
      });
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

interface DirectiveRewrite {
  blocked: boolean;
  names: Set<string>;
  output: string;
}

/**
 * Returns directive names whose legacy two-parameter function definition is in this file.
 * Cross-file definitions are deliberately excluded until workspace semantic analysis is enabled.
 */
function discoverLocalDirectiveFactories(source: string): Set<string> {
  const names = new Set<string>();
  const pattern = /\b(?:export\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + match[0].length - 1);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const params = splitTopLevel(source.slice(open + 1, close));
    if (params.length === 2 && /^[A-Za-z_$][\w$]*\s*:\s*[\s\S]+$/.test(params[0])) {
      names.add(match[1]);
    }
  }
  return names;
}

/**
 * Converts intrinsic `use:name={value}` attributes to Solid 2 ref-factory calls.
 * Only definitions proven local to this file are changed; cross-file directives become blockers.
 */
function rewriteDirectiveUsages(source: string, localFactories: Set<string>): DirectiveRewrite {
  const names = new Set<string>();
  const edits: Array<{ start: number; end: number; text: string }> = [];
  let blocked = false;
  const pattern = /<([a-z][\w:-]*)(?=[\s/>])/g;
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const tagEnd = findJsxTagEnd(source, match.index);
    if (tagEnd === -1) continue;
    const opening = source.slice(match.index, tagEnd + 1);
    for (const directiveMatch of opening.matchAll(/\buse:([A-Za-z_$][\w$]*)\s*=/g)) {
      const name = directiveMatch[1];
      const attribute = findJsxAttribute(opening, `use:${name}`);
      if (!attribute) continue;
      if (!localFactories.has(name)) {
        blocked = true;
        continue;
      }
      const expression = unwrapJsxExpression(attribute.value);
      names.add(name);
      edits.push({
        start: match.index + attribute.start,
        end: match.index + attribute.end,
        text: `ref={${name}(() => ${expression})}`,
      });
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return { blocked, names, output };
}

/**
 * Rewrites two-parameter legacy directive functions into ref factories for used directives.
 * Functions outside the exact `(element: Type, value)` shape are left for manual review.
 */
function rewriteDirectiveFactories(source: string, names: Set<string>): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const name of names) {
    const pattern = new RegExp(`\\b(export\\s+)?function\\s+${escapeRegExp(name)}\\s*\\(`, "g");
    for (const match of source.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const open = source.indexOf("(", match.index + match[0].length - 1);
      const close = matchingParen(source, open);
      if (close === -1) continue;
      const params = splitTopLevel(source.slice(open + 1, close));
      // Parameter count and typed element shape are the proof this is a legacy directive factory.
      if (params.length !== 2) continue;
      const element = params[0].match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
      if (!element) continue;
      let bodyOpen = close + 1;
      while (/\s/.test(source[bodyOpen] ?? "")) bodyOpen += 1;
      if (source[bodyOpen] !== "{") continue;
      const bodyClose = findBalancedEnd(source, bodyOpen, "{", "}");
      if (bodyClose === -1) continue;
      const indentStart = source.lastIndexOf("\n", match.index) + 1;
      const indent = source.slice(indentStart, match.index).match(/^[ \t]*/)?.[0] ?? "";
      const inner = source.slice(bodyOpen + 1, bodyClose).trimEnd();
      const exported = match[1] ?? "";
      const replacement = `${exported}function ${name}(${params[1]}) {\n${indent}  let ${element[1]}!: ${element[2]};${inner}\n${indent}  return (nextElement: ${element[2]}) => {\n${indent}    ${element[1]} = nextElement;\n${indent}  };\n${indent}}`;
      // Replace the whole declaration so the old eager element parameter cannot survive.
      edits.push({ start: match.index, end: bodyClose + 1, text: replacement });
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Removes the obsolete `solid-js` Directives module augmentation after directive migration.
 * Other module augmentations are retained by checking the balanced declaration body first.
 */
function removeLegacyDirectiveAugmentation(source: string): string {
  const pattern = /\bdeclare\s+module\s+["']solid-js["']\s*\{/g;
  const edits: Array<{ start: number; end: number }> = [];
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("{", match.index);
    const close = findBalancedEnd(source, open, "{", "}");
    if (close === -1) continue;
    const body = source.slice(open + 1, close);
    // Do not delete a general `solid-js` augmentation unless it declares legacy Directives.
    if (!/\binterface\s+Directives\b/.test(body)) continue;
    let end = close + 1;
    while (source[end] === "\r" || source[end] === "\n") end += 1;
    edits.push({ start: match.index, end });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + output.slice(edit.end);
  }
  return output;
}

/**
 * Renames paired JSX elements as a unit and optionally inserts an attribute.
 * `localName` comes from an import-derived binding; the stack preserves nesting,
 * and the result reports how many element nodes were actually changed.
 */
function rewritePairedJsxElements(
  source: string,
  localName: string,
  nextName: string,
  addedAttribute?: string,
): { output: string; count: number } {
  const pattern = new RegExp(`<(/?)${escapeRegExp(localName)}(?=[\\s/>])`, "g");
  const stack: Array<{ nameStart: number; tagEnd: number }> = [];
  const edits: Array<{ start: number; end: number; text: string }> = [];
  let count = 0;

  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const tagEnd = findJsxTagEnd(source, match.index);
    if (tagEnd === -1) continue;
    const closing = match[1] === "/";
    const nameStart = match.index + (closing ? 2 : 1);
    if (closing) {
      // A closing tag is rewritten only when a structurally paired opening tag was seen.
      const opening = stack.pop();
      if (!opening) continue;
      edits.push({ start: opening.nameStart, end: opening.nameStart + localName.length, text: nextName });
      edits.push({ start: nameStart, end: nameStart + localName.length, text: nextName });
      if (addedAttribute) {
        const openingText = source.slice(opening.nameStart, opening.tagEnd);
        // Existing output attributes are an idempotency guard for repeated codemod runs.
        if (!new RegExp(`\\b${addedAttribute.replace(/=.*/, "")}\\s*=`).test(openingText)) {
          const lineStart = source.lastIndexOf("\n", opening.tagEnd - 1) + 1;
          const trailing = source.slice(lineStart, opening.tagEnd);
          const indent = trailing.match(/^([ \t]*)$/)?.[1];
          if (indent === undefined) {
            edits.push({ start: opening.tagEnd, end: opening.tagEnd, text: ` ${addedAttribute}` });
          } else {
            const previousLineStart = source.lastIndexOf("\n", lineStart - 2) + 1;
            const previousLine = source.slice(previousLineStart, lineStart - 1);
            const attributeIndent = previousLine.match(/^([ \t]*)/)?.[1] ?? indent;
            edits.push({
              start: lineStart,
              end: opening.tagEnd,
              text: `${attributeIndent}${addedAttribute}\n${indent}`,
            });
          }
        }
      }
      count += 1;
    } else if (source.slice(match.index, tagEnd).trimEnd().endsWith("/")) {
      edits.push({ start: nameStart, end: nameStart + localName.length, text: nextName });
      if (addedAttribute) edits.push({ start: tagEnd - 1, end: tagEnd - 1, text: ` ${addedAttribute}` });
      count += 1;
    } else {
      stack.push({ nameStart, tagEnd });
    }
  }

  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return { output, count };
}

/**
 * Rewrites eager reactive fields in one object-literal body as getters.
 * Delimiter-depth tracking splits only top-level properties; unrecognized property shapes
 * and already-lazy values are preserved to avoid changing evaluation semantics.
 */
function rewriteReactiveObjectProperties(body: string, itemName: string): string {
  const boundaries = [0];
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "," && round === 0 && square === 0 && curly === 0) boundaries.push(index + 1);
  }
  boundaries.push(body.length + 1);

  let output = "";
  for (let index = 0; index < boundaries.length - 1; index += 1) {
    const start = boundaries[index];
    const next = boundaries[index + 1];
    const hasComma = next <= body.length;
    const segment = body.slice(start, hasComma ? next - 1 : body.length);
    const leading = segment.match(/^\s*/)?.[0] ?? "";
    const trailing = segment.match(/\s*$/)?.[0] ?? "";
    const core = segment.slice(leading.length, segment.length - trailing.length);
    const property = core.match(/^([A-Za-z_$][\w$]*)\s*:\s*([\s\S]+)$/);
    // Spreads, methods, computed keys, and shorthand fields are outside the safe property shape.
    if (!property) {
      output += segment + (hasComma ? "," : "");
      continue;
    }

    const expression = property[2].trim();
    const lazy = /^(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>|^function\b/.test(expression);
    const readsItem = new RegExp(`\\b${escapeRegExp(itemName)}\\s*\\(`).test(expression);
    const readsProps = /\bprops\s*(?:\.|\[)/.test(expression);
    // A getter defers the reactive read until the receiving component consumes the property.
    const replacement = !lazy && (readsItem || readsProps)
      ? `get ${property[1]}() { return ${expression}; }`
      : core;
    output += leading + replacement + trailing + (hasComma ? "," : "");
  }
  return output;
}

/**
 * Finds object literals inside imported `Index` callbacks and delegates eager-field rewrites.
 * Index callbacks are structural and untracked in Solid 2, so getters defer reads until a
 * child consumes the property. Returns updated source without mutating the ast-grep tree.
 */
function rewriteIndexCallbackObjectReads(source: string, localName: string): string {
  const tagPattern = new RegExp(`<(/?)${escapeRegExp(localName)}(?=[\\s/>])`, "g");
  const stack: Array<{ tagEnd: number }> = [];
  const elementBodies: Array<{ start: number; end: number }> = [];
  for (const match of source.matchAll(tagPattern)) {
    if (match.index === undefined) continue;
    const tagEnd = findJsxTagEnd(source, match.index);
    if (tagEnd === -1) continue;
    if (match[1] === "/") {
      const opening = stack.pop();
      if (opening) elementBodies.push({ start: opening.tagEnd + 1, end: match.index });
    } else if (!source.slice(match.index, tagEnd).trimEnd().endsWith("/")) {
      stack.push({ tagEnd });
    }
  }

  const edits = new Map<number, { start: number; end: number; text: string }>();
  for (const range of elementBodies) {
    const children = source.slice(range.start, range.end);
    const callback = children.match(
      /\{\s*(?:\(\s*([A-Za-z_$][\w$]*)(?:\s*,\s*[A-Za-z_$][\w$]*)?\s*\)|([A-Za-z_$][\w$]*))\s*=>\s*\{/,
    );
    // Only block-bodied Index callbacks expose a safely bounded scope for object scanning.
    if (!callback || callback.index === undefined) continue;
    const itemName = callback[1] ?? callback[2];
    const callbackOpen = range.start + callback.index + callback[0].lastIndexOf("{");
    const callbackClose = findBalancedEnd(source, callbackOpen, "{", "}");
    if (callbackClose === -1) continue;
    const callbackBody = source.slice(callbackOpen + 1, callbackClose);
    const objectPattern = /\bconst\s+[A-Za-z_$][\w$]*\s*=\s*\{/g;
    for (const objectMatch of callbackBody.matchAll(objectPattern)) {
      if (objectMatch.index === undefined) continue;
      const objectOpen = callbackOpen + 1 + objectMatch.index + objectMatch[0].lastIndexOf("{");
      const objectClose = findBalancedEnd(source, objectOpen, "{", "}");
      // Reject an unbalanced object or one that escapes the callback's structural boundary.
      if (objectClose === -1 || objectClose > callbackClose) continue;
      const body = source.slice(objectOpen + 1, objectClose);
      const rewritten = rewriteReactiveObjectProperties(body, itemName);
      if (rewritten !== body) {
        edits.set(objectOpen, { start: objectOpen + 1, end: objectClose, text: rewritten });
      }
    }
  }

  let output = source;
  for (const edit of [...edits.values()].sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Wraps direct `props` reads passed as a createSignal initializer in `untrack`.
 * Only a simple member chain is accepted; complex expressions are skipped as ambiguous.
 */
function rewriteReactiveSignalInitializers(source: string, localName: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const pattern = new RegExp(`\\b${escapeRegExp(localName)}(?:\\s*<[^\\n=]+?>)?\\s*\\(`, "g");
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + match[0].length - 1);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const args = splitTopLevel(source.slice(open + 1, close));
    if (args.length === 0) continue;
    const initial = args[0];
    if (!/^props(?:\??\.[A-Za-z_$][\w$]*|\[[^\]\n]+\])+$/.test(initial)) continue;
    // The narrow member-chain guard above avoids capturing unrelated work inside `untrack`.
    const offset = source.slice(open + 1, close).indexOf(initial);
    if (offset === -1) continue;
    edits.push({
      start: open + 1 + offset,
      end: open + 1 + offset + initial.length,
      text: `untrack(() => ${initial})`,
    });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

interface SplitPropsRewrite {
  blocked: boolean;
  count: number;
  output: string;
}

/** Returns true only when every use of a selected binding is a read of one selected key. */
function selectedBindingHasOnlyProvenReads(
  source: string,
  declarationStart: number,
  declarationEnd: number,
  local: string,
  keys: Set<string>,
): boolean {
  // Restrict the textual reference check to the declaration's nearest lexical block. Scanning the
  // entire file conflates sibling functions that independently use common parameter names such as
  // `props`. Nested shadowing remains conservative: an ambiguous same-name binding blocks migration.
  let scopeStart = 0;
  let scopeEnd = source.length;
  for (let open = source.lastIndexOf("{", declarationStart); open >= 0; open = source.lastIndexOf("{", open - 1)) {
    const close = findBalancedEnd(source, open, "{", "}");
    if (close >= declarationEnd) {
      scopeStart = open + 1;
      scopeEnd = close;
      break;
    }
  }
  const pattern = new RegExp(`\\b${escapeRegExp(local)}\\b`, "g");
  const scopedSource = source.slice(scopeStart, scopeEnd);
  for (const match of scopedSource.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const absoluteIndex = scopeStart + match.index;
    if (absoluteIndex >= declarationStart && absoluteIndex < declarationEnd) continue;
    const suffix = source.slice(absoluteIndex + local.length);
    const dot = suffix.match(/^\??\.([A-Za-z_$][\w$]*)/);
    const bracket = suffix.match(/^\s*\[\s*["']([^"']+)["']\s*\]/);
    const key = dot?.[1] ?? bracket?.[1];
    if (!key || !keys.has(key)) return false;
  }
  return true;
}

/**
 * Converts proven two-result `splitProps` declarations to direct props plus `omit`.
 * Rest-only declarations are always local-safe. Selected bindings are accepted only when every
 * use is a direct read of a statically selected key; all other shapes receive a stable blocker.
 */
function rewriteSplitPropsDeclarations(source: string, localName: string): SplitPropsRewrite {
  const pattern = new RegExp(
    `^([ \\t]*)const\\s*\\[\\s*([A-Za-z_$][\\w$]*)?\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*${escapeRegExp(localName)}\\(\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*\\[([\\s\\S]*?)\\]\\s*\\);`,
    "gm",
  );
  let blocked = false;
  let count = 0;
  const output = source.replace(
    pattern,
    (full, indent: string, selected: string | undefined, rest: string, props: string, keysSource: string, offset: number) => {
      const local = selected ?? "";
      const keys = splitTopLevel(keysSource);
      const literalKeys = keys.map((key) => key.match(/^["']([^"']+)["']$/)?.[1]);
      const safeSelectedReads =
        local.length > 0 &&
        literalKeys.every((key): key is string => key !== undefined) &&
        selectedBindingHasOnlyProvenReads(
          source,
          offset,
          offset + full.length,
          local,
          new Set(literalKeys as string[]),
        );
      if (local && !safeSelectedReads) {
        blocked = true;
        return source.slice(Math.max(0, offset - PROPS_BLOCKER.length - 2), offset).includes(PROPS_BLOCKER)
          ? full
          : `${indent}${PROPS_BLOCKER}\n${full}`;
      }
      count += 1;
      const omitted = keys.join(", ");
      const selectedDeclaration = local ? `${indent}const ${local} = ${props};\n` : "";
      return `${selectedDeclaration}${indent}const ${rest} = omit(${props}${omitted ? `, ${omitted}` : ""});`;
    },
  );

  // Calls outside the supported declaration grammar are semantic blockers, never global renames.
  const residual = new RegExp(`\\b${escapeRegExp(localName)}\\s*\\(`).test(
    output.slice(parseNamedImports(output).at(-1)?.end ?? 0),
  );
  if (residual && !output.includes(PROPS_BLOCKER)) {
    return { blocked: true, count, output: `${PROPS_BLOCKER}\n${output}` };
  }
  return { blocked: blocked || residual, count, output };
}

/** Finds variables initialized by an imported `createContext` for provider-tag migration. */
function discoverContextBindings(source: string): string[] {
  const bindings: string[] = [];
  for (const createContextName of importedLocalNames(source, "solid-js", "createContext")) {
    const pattern = new RegExp(
      `\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${escapeRegExp(createContextName)}(?:\\s*<[^;=]+?>)?\\s*\\(`,
      "g",
    );
    for (const match of source.matchAll(pattern)) bindings.push(match[1]);
  }
  return bindings;
}

interface AsyncResourceRewrite {
  output: string;
  resources: string[];
}

/**
 * Replaces `localName(() => expression)` with the arrow body for removed transition wrappers.
 * Calls with parameters or other callback shapes are skipped to preserve behavior.
 */
function unwrapZeroArgumentArrowCall(source: string, localName: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const pattern = new RegExp(`\\b${escapeRegExp(localName)}\\s*\\(`, "g");
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + localName.length);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const argument = source.slice(open + 1, close).trim();
    const arrow = argument.match(/^\(\s*\)\s*=>\s*([\s\S]+)$/);
    if (!arrow) continue;
    const body = arrow[1].trim();
    edits.push({
      start: match.index,
      end: close + 1,
      text: body.startsWith("{") && body.endsWith("}") ? body.slice(1, -1).trim() : body,
    });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Rewrites the supported `[resource] = createResource(source, fetcher)` declaration to a memo.
 * Also returns resource binding names needed by later loading-state and transition rewrites.
 */
function rewriteAsyncResourceDeclarations(
  source: string,
  createResourceName: string,
  createMemoName: string,
): AsyncResourceRewrite {
  const resources: string[] = [];
  const pattern = new RegExp(
    `^([ \\t]*)const\\s*\\[\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*${escapeRegExp(createResourceName)}\\(\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*\\);`,
    "gm",
  );
  const output = source.replace(
    pattern,
    (_full, indent: string, resource: string, sourceName: string, fetcher: string) => {
      resources.push(resource);
      return `${indent}const ${resource} = ${createMemoName}(() => {\n${indent}  const sourceValue = ${sourceName}();\n${indent}  return sourceValue == null || (sourceValue as unknown) === false ? undefined : ${fetcher}(sourceValue);\n${indent}});`;
    },
  );
  return { output, resources };
}

/**
 * Updates `Errored` fallback property reads because its error parameter is now an accessor.
 * Only direct `parameter.property` reads inside a recognized fallback attribute are changed.
 */
function rewriteErroredFallbackAccessors(source: string, erroredNames: Set<string>): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const erroredName of erroredNames) {
    const pattern = new RegExp(`<${escapeRegExp(erroredName)}(?=[\\s/>])`, "g");
    for (const match of source.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const end = findJsxTagEnd(source, match.index);
      if (end === -1) continue;
      const opening = source.slice(match.index, end + 1);
      const fallback = findJsxAttribute(opening, "fallback");
      if (!fallback) continue;
      const parameter = fallback.value.match(/^\{\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*=>/)?.[1];
      if (!parameter) continue;
      const nextValue = fallback.value.replace(
        new RegExp(`\\b${escapeRegExp(parameter)}\\.`, "g"),
        `(${parameter}() as Error).`,
      );
      if (nextValue !== fallback.value) {
        edits.push({
          start: match.index + fallback.start,
          end: match.index + fallback.end,
          text: `fallback=${nextValue}`,
        });
      }
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Coordinates the supported Solid 1 async API migration: transitions, resources,
 * loading/error boundaries, and accessor reads. Generated import mappings avoid global renames.
 */
function rewriteAsyncApis(source: string): { imports: Map<string, string>; output: string } {
  const imports = new Map<string, string>();
  const transitionBindings: Array<{ pending: string; start: string }> = [];
  for (const useTransitionName of importedLocalNames(source, "solid-js", "useTransition")) {
    const pattern = new RegExp(
      `^([ \\t]*)const\\s*\\[\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*${escapeRegExp(useTransitionName)}\\(\\s*\\);[ \\t]*(?:\\r?\\n)?`,
      "gm",
    );
    source = source.replace(pattern, (_full, _indent: string, pending: string, start: string) => {
      transitionBindings.push({ pending, start });
      return "";
    });
  }
  for (const { start } of transitionBindings) source = unwrapZeroArgumentArrowCall(source, start);

  const resources: string[] = [];
  let firstMemoName = "";
  for (const createResourceName of importedLocalNames(source, "solid-js", "createResource")) {
    const createMemoName = unusedIdentifier(source, "createMemo");
    const rewritten = rewriteAsyncResourceDeclarations(source, createResourceName, createMemoName);
    source = rewritten.output;
    resources.push(...rewritten.resources);
    if (rewritten.resources.length > 0) {
      firstMemoName ||= createMemoName;
      imports.set(
        `createResource\0${createResourceName}`,
        importAs("createMemo", createMemoName),
      );
    }
  }
  // Pending accessors can only be reconstructed when a migrated resource supplies tracked work.
  if (resources.length > 0) {
    const anchor = new RegExp(`(^[ \\t]*const\\s+${escapeRegExp(resources[0])}\\s*=\\s*${escapeRegExp(firstMemoName)}\\([\\s\\S]*?^[ \\t]*\\}\\);)`, "m");
    const pendingLines = transitionBindings
      .map(({ pending }, index) => `const ${pending} = () => isPending(() => ${resources[Math.min(index, resources.length - 1)]}());`)
      .join("\n");
    if (pendingLines) source = source.replace(anchor, `$1\n${pendingLines}`);
  }
  for (const resource of resources) {
    source = source.replace(
      /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.loading\b/g,
      (full, accessor: string) =>
        accessor.split(".").at(-1) === resource ? `isPending(() => ${accessor}())` : full,
    );
  }

  for (const suspenseName of importedLocalNames(source, "solid-js", "Suspense")) {
    const loadingName = unusedIdentifier(source, "Loading");
    const rewritten = rewritePairedJsxElements(source, suspenseName, loadingName);
    source = rewritten.output;
    if (rewritten.count > 0) {
      imports.set(`Suspense\0${suspenseName}`, importAs("Loading", loadingName));
    }
  }
  const erroredNames = new Set<string>();
  for (const boundaryName of importedLocalNames(source, "solid-js", "ErrorBoundary")) {
    const erroredName = unusedIdentifier(source, "Errored");
    const rewritten = rewritePairedJsxElements(source, boundaryName, erroredName);
    source = rewritten.output;
    if (rewritten.count > 0) {
      erroredNames.add(erroredName);
      imports.set(`ErrorBoundary\0${boundaryName}`, importAs("Errored", erroredName));
    }
  }
  source = rewriteErroredFallbackAccessors(source, erroredNames);

  const hasResidualAsync = ["createResource", "useTransition", "Suspense", "ErrorBoundary"].some(
    (exported) =>
      importedLocalNames(source, "solid-js", exported).some((local) =>
        new RegExp(
          exported === "Suspense" || exported === "ErrorBoundary"
            ? `<${escapeRegExp(local)}\\b`
            : `\\b${escapeRegExp(local)}\\s*\\(`,
        ).test(source.slice(parseNamedImports(source).at(-1)?.end ?? 0)),
      ),
  );
  if (hasResidualAsync && !source.includes(ASYNC_BLOCKER)) source = `${ASYNC_BLOCKER}\n${source}`;
  return { imports, output: source };
}

/** Splits generic type-argument text on top-level commas while preserving nested type syntax. */
function splitTypeArguments(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let angle = 0;
  let round = 0;
  let square = 0;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "<") angle += 1;
    else if (char === ">") angle -= 1;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "," && angle === 0 && round === 0 && square === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts.filter(Boolean);
}

/**
 * Replaces supported createSelector declarations with a typed comparator closure.
 * Generic and call argument shapes are guarded; unsafe or untyped declarations remain unchanged.
 */
function rewriteSelectorDeclarations(source: string, localName: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const pattern = new RegExp(
    `\\bconst\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*${escapeRegExp(localName)}(?:\\s*<([\\s\\S]*?)>)?\\s*\\(`,
    "g",
  );
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + match[0].length - 1);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const args = splitTopLevel(source.slice(open + 1, close));
    if (args.length < 1 || args.length > 2) continue;
    // The replacement models only source plus optional comparator, never extra options.
    const typeArguments = splitTypeArguments(match[2] ?? "");
    const keyType = typeArguments[1] ?? typeArguments[0];
    // Without a key type the generated function would lose TypeScript information.
    if (!keyType) continue;
    const sourceAccessor = args[0];
    const comparator = args[1] ?? "(key, value) => key === value";
    let end = close + 1;
    while (/\s/.test(source[end] ?? "")) end += 1;
    if (source[end] === ";") end += 1;
    edits.push({
      start: match.index,
      end,
      text: `const ${match[1]} = (key: ${keyType}) => (${comparator})(key, ${sourceAccessor}());`,
    });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Reclassifies Solid imports, removes migrated legacy exports, and adds helpers requested by flags.
 * Removed store APIs still called in the program body produce stable blocker comments instead.
 */
function rewriteImports(source: string, flags: TransformFlags): string {
  source = source.replace(/(["'])solid-js\/web\1/g, "$1@solidjs/web$1");

  const imports = parseNamedImports(source);
  if (imports.length === 0) return source;

  const solid: string[] = [];
  const web: string[] = [];
  const blockers: string[] = [];
  const programBody = source.slice(imports[imports.length - 1].end);

  for (const declaration of imports) {
    for (const specifier of declaration.specifiers) {
      const name = importedName(specifier);
      const local = localImportName(specifier);
      const explicitReplacement = flags.importReplacements.get(`${name}\0${local}`);
      if (declaration.module === "solid-js" && explicitReplacement) {
        solid.push(explicitReplacement);
        continue;
      }
      // Module provenance decides whether an identically named export is safe to re-home.
      if (declaration.module === "solid-js/store") {
        if (REMOVED_STORE_EXPORTS.has(name)) {
          const local = localImportName(specifier);
          // A removed API still used after earlier rewrites is unsafe, so emit a manual blocker.
          if (new RegExp(`\\b${escapeRegExp(local)}\\s*\\(`).test(programBody)) {
            const blocker = STORE_BLOCKER(name);
            // Keep blocker output idempotent across repeated runs.
            if (!source.includes(blocker)) blockers.push(blocker);
          }
        } else {
          solid.push(specifier);
        }
        continue;
      }

      if (declaration.module === "@solidjs/web") {
        web.push(specifier);
        continue;
      }

      if (name === "ComponentProps" || name === "JSX") {
        web.push(specifier.startsWith("type ") ? specifier : `type ${specifier}`);
      } else if (name === "JSXElement") {
        const local = localImportName(specifier);
        solid.push(`type Element${local === "JSXElement" ? " as JSXElement" : ` as ${local}`}`);
      } else if (name === "mergeProps") {
        // Import aliasing changes the export without touching shadowed local identifiers.
        solid.push(importAs("merge", localImportName(specifier)));
      } else if (name === "splitProps") {
        const local = localImportName(specifier);
        // Residual calls are paired with S2-BLOCKER-PROPS-001 and kept for an honest failure.
        if (new RegExp(`\\b${escapeRegExp(local)}\\s*\\(`).test(programBody)) solid.push(specifier);
      } else if (name === "batch") {
        const local = localImportName(specifier);
        if (new RegExp(`\\b${escapeRegExp(local)}\\s*\\(`).test(programBody)) {
          solid.push(importAs("flush", local));
        }
      } else if (
        (name === "onMount" || name === "onCleanup") &&
        !new RegExp(`\\b${escapeRegExp(localImportName(specifier))}\\s*\\(`).test(programBody)
      ) {
        continue;
      } else if (
        name === "useTransition" &&
        !new RegExp(`\\b${escapeRegExp(localImportName(specifier))}\\s*\\(`).test(programBody)
      ) {
        continue;
      } else if (
        name === "createSelector" &&
        !new RegExp(`\\b${escapeRegExp(localImportName(specifier))}(?:\\s*<|\\s*\\()`).test(programBody)
      ) {
        continue;
      } else if (
        name === "Index" &&
        !new RegExp(`<${escapeRegExp(localImportName(specifier))}\\b`).test(programBody)
      ) {
        continue;
      } else {
        solid.push(specifier);
      }
    }
  }

  if (flags.deep) solid.push("deep");
  if (flags.flush) solid.push("flush");
  if (flags.forComponent && !solid.some((specifier) => importedName(specifier) === "For")) {
    solid.push("For");
  }
  if (flags.isPending) solid.push("isPending");
  if (flags.omit) solid.push("omit");
  if (flags.onSettled) solid.push("onSettled");
  if (flags.snapshot) solid.push("snapshot");
  if (flags.storePath) solid.push("storePath");
  if (flags.untrack) solid.push("untrack");

  const declarations = [
    ["solid-js", uniqueSpecifiers(solid)],
    ["@solidjs/web", uniqueSpecifiers(web)],
  ] as const;
  const rebuiltImports = declarations
    .filter(([, specifiers]) => specifiers.length > 0)
    .map(([module, specifiers]) => `import { ${specifiers.join(", ")} } from "${module}";`)
    .join("\n");
  const replacement = [rebuiltImports, ...blockers].filter(Boolean).join("\n");

  const first = imports[0].start;
  let output = source;
  // Delete import ranges backwards so offsets captured from the original source remain valid.
  for (const declaration of [...imports].reverse()) {
    output = output.slice(0, declaration.start) + output.slice(declaration.end);
  }
  let remainder = output.slice(first);
  if (blockers.length > 0 && !rebuiltImports) remainder = remainder.replace(/^\r?\n/, "");
  return output.slice(0, first) + replacement + (replacement ? "\n" : "") + remainder;
}

/**
 * Finds the closing parenthesis paired with `open`, ignoring parentheses inside strings.
 * Call-shape rewrites use -1 as a signal to leave malformed/unsupported text untouched.
 */
function matchingParen(source: string, open: number): number {
  let depth = 0;
  let quote = "";
  let escaped = false;

  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")" && --depth === 0) return index;
  }
  return -1;
}

/**
 * Splits comma-separated source while tracking nested (), [], {}, generic angles, and strings.
 * This approximates AST argument boundaries for the codemod's deliberately narrow text rewrites.
 */
function splitTopLevel(source: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let round = 0;
  let square = 0;
  let curly = 0;
  let angle = 0;
  let quote = "";
  let escaped = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "<") angle += 1;
    else if (char === ">" && angle > 0) angle -= 1;
    else if (char === "," && round === 0 && square === 0 && curly === 0 && angle === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = source.slice(start).trim();
  if (tail) parts.push(tail);
  return parts;
}

interface StoreBindings {
  produceNames: Set<string>;
  reconcileNames: Set<string>;
  stores: Set<string>;
  setterToStore: Map<string, string>;
  setters: Set<string>;
}

/**
 * Discovers createStore state/setter pairs, setter aliases, and reconcile aliases from imports.
 * The returned binding map gates store rewrites and relates each setter to its readable store.
 */
function discoverStoreBindings(source: string): StoreBindings {
  const setterToStore = new Map<string, string>();
  const stores = new Set<string>();
  for (const createStoreName of importedLocalNames(source, "solid-js/store", "createStore").concat(
    importedLocalNames(source, "solid-js", "createStore"),
  )) {
    const pattern = new RegExp(
      `\\b(?:const|let)\\s*\\[\\s*([A-Za-z_$][\\w$]*)\\s*,\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*${createStoreName}(?:\\s*<[^\\n=]+?>)?\\s*\\(`,
      "g",
    );
    for (const match of source.matchAll(pattern)) {
      stores.add(match[1]);
      setterToStore.set(match[2], match[1]);
    }
    const readonlyPattern = new RegExp(
      `\\b(?:const|let)\\s*\\[\\s*([A-Za-z_$][\\w$]*)\\s*\\]\\s*=\\s*${createStoreName}(?:\\s*<[^\\n=]+?>)?\\s*\\(`,
      "g",
    );
    for (const match of source.matchAll(readonlyPattern)) stores.add(match[1]);
  }

  // Iterate to a fixed point so chains such as `alias2 = alias1 = setStore` are recognized.
  let changed = true;
  while (changed) {
    changed = false;
    const aliases = /\b(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*([A-Za-z_$][\w$]*)\s*;/g;
    for (const match of source.matchAll(aliases)) {
      // Propagate only from proven setters and never overwrite a binding already classified.
      if (!setterToStore.has(match[2]) || setterToStore.has(match[1])) continue;
      setterToStore.set(match[1], setterToStore.get(match[2])!);
      changed = true;
    }
  }
  const reconcileNames = new Set(
    importedLocalNames(source, "solid-js/store", "reconcile").concat(
      importedLocalNames(source, "solid-js", "reconcile"),
    ),
  );
  const produceNames = new Set(
    importedLocalNames(source, "solid-js/store", "produce").concat(
      importedLocalNames(source, "solid-js", "produce"),
    ),
  );
  return { produceNames, reconcileNames, stores, setterToStore, setters: new Set(setterToStore.keys()) };
}

interface SourceRange {
  end: number;
  start: number;
}

/** Returns trimmed source ranges for each top-level argument between a call's parentheses. */
function topLevelArgumentRanges(source: string, start: number, end: number): SourceRange[] {
  const ranges: SourceRange[] = [];
  let partStart = start;
  let round = 0;
  let square = 0;
  let curly = 0;
  let quote = "";
  let escaped = false;
  const push = (partEnd: number) => {
    let trimmedStart = partStart;
    let trimmedEnd = partEnd;
    while (/\s/.test(source[trimmedStart] ?? "") && trimmedStart < trimmedEnd) trimmedStart += 1;
    while (/\s/.test(source[trimmedEnd - 1] ?? "") && trimmedEnd > trimmedStart) trimmedEnd -= 1;
    if (trimmedStart < trimmedEnd) ranges.push({ start: trimmedStart, end: trimmedEnd });
  };
  for (let index = start; index < end; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = "";
      continue;
    }
    if (char === '"' || char === "'" || char === "`") quote = char;
    else if (char === "(") round += 1;
    else if (char === ")") round -= 1;
    else if (char === "[") square += 1;
    else if (char === "]") square -= 1;
    else if (char === "{") curly += 1;
    else if (char === "}") curly -= 1;
    else if (char === "," && round === 0 && square === 0 && curly === 0) {
      push(index);
      partStart = index + 1;
    }
  }
  push(end);
  return ranges;
}

/** Removes imported `produce` wrappers only when they are complete setter/storePath arguments. */
function removeProvenProduceArguments(statement: string, bindings: StoreBindings): string {
  const setter = statement.match(/^([A-Za-z_$][\w$]*)\s*\(/)?.[1];
  if (!setter || !bindings.setters.has(setter) || bindings.produceNames.size === 0) return statement;
  const setterOpen = statement.indexOf("(", setter.length);
  const setterClose = matchingParen(statement, setterOpen);
  if (setterClose === -1) return statement;
  const argumentRanges = topLevelArgumentRanges(statement, setterOpen + 1, setterClose);
  for (const range of [...argumentRanges]) {
    const argument = statement.slice(range.start, range.end);
    const storePath = argument.match(/^storePath\s*\(/);
    if (!storePath) continue;
    const open = range.start + argument.indexOf("(");
    const close = matchingParen(statement, open);
    if (close === range.end - 1) {
      argumentRanges.push(...topLevelArgumentRanges(statement, open + 1, close));
    }
  }
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const range of argumentRanges) {
    const argument = statement.slice(range.start, range.end);
    const wrapper = argument.match(/^([A-Za-z_$][\w$]*)\s*\(/);
    if (!wrapper || !bindings.produceNames.has(wrapper[1])) continue;
    const open = range.start + argument.indexOf("(");
    const close = matchingParen(statement, open);
    if (close !== range.end - 1) continue;
    const inner = topLevelArgumentRanges(statement, open + 1, close);
    if (inner.length !== 1) continue;
    edits.push({ start: range.start, end: range.end, text: statement.slice(open + 1, close) });
  }
  let output = statement;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/**
 * Migrates one expression statement that calls a discovered Solid 1 store setter.
 * Returns replacement text for known path/value shapes and null when semantics are ambiguous.
 */
function migrateStoreSetterCall(statement: string, bindings: StoreBindings): string | null {
  const match = statement.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  // Binding discovery is the scope guard against rewriting unrelated functions named like setters.
  if (!match || !bindings.setters.has(match[1])) return null;
  const withoutProduce = removeProvenProduceArguments(statement, bindings);
  if (withoutProduce !== statement) {
    return migrateStoreSetterCall(withoutProduce, bindings) ?? withoutProduce;
  }
  const open = statement.indexOf("(", match[0].length - 1);
  const close = matchingParen(statement, open);
  if (close === -1) return null;
  const argsSource = statement.slice(open + 1, close);
  const args = splitTopLevel(argsSource);
  if (args.length > 1) {
    const reconcileName = args[args.length - 1].match(/^([A-Za-z_$][\w$]*)\s*\(/)?.[1];
    if (reconcileName && bindings.reconcileNames.has(reconcileName)) {
      const path = args.slice(0, -1);
      // Literal paths can be expressed as direct draft indexing; dynamic paths need storePath.
      if (path.every((part) => /^(?:["'][^"']+["']|\d+)$/.test(part))) {
        const target = path.map((part) => `[${part}]`).join("");
        return `${statement.slice(0, open + 1)}(draft) => ${args[args.length - 1]}(draft${target})${statement.slice(close)}`;
      }
    }
    return `${statement.slice(0, open + 1)}storePath(${argsSource.trim()})${statement.slice(close)}`;
  }
  if (args.length !== 1) return null;
  const arg = args[0];
  // Existing updater functions already have Solid 2's lazy shape and must not be wrapped again.
  if (/^(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/.test(arg) || /^function\b/.test(arg)) {
    return null;
  }
  if (arg.startsWith("{") && arg.endsWith("}")) {
    return `${statement.slice(0, open + 1)}() => (${arg})${statement.slice(close)}`;
  }
  if (arg.startsWith("[") || /^(?:null|undefined|true|false|[-+]?\d|["'`])/.test(arg)) {
    return `${statement.slice(0, open + 1)}() => ${arg}${statement.slice(close)}`;
  }
  return null;
}

/**
 * Reprocesses nested setter statements to a fixed point after ast-grep commits overlapping edits.
 * An outer setter can contain method bodies with inner setters; applying only the outer AST edit
 * otherwise restores the original inner text and defers those rewrites until a second codemod run.
 */
function rewriteNestedStoreSetters(
  source: string,
  bindings: StoreBindings,
): { output: string; changed: boolean } {
  let output = source;
  let changed = false;

  for (let iteration = 0; iteration < 100; iteration += 1) {
    const candidates: Array<{ start: number; end: number; replacement: string }> = [];
    for (const setter of bindings.setters) {
      const pattern = new RegExp(`\\b${escapeRegExp(setter)}\\s*\\(`, "g");
      for (const match of output.matchAll(pattern)) {
        if (match.index === undefined) continue;
        const open = output.indexOf("(", match.index + setter.length);
        const close = matchingParen(output, open);
        if (close === -1) continue;
        let end = close + 1;
        while (/[ \t]/.test(output[end] ?? "")) end += 1;
        if (output[end] === ";") end += 1;
        const statement = output.slice(match.index, end);
        const replacement = migrateStoreSetterCall(statement, bindings);
        if (replacement && replacement !== statement) {
          candidates.push({ start: match.index, end, replacement });
        }
      }
    }
    if (candidates.length === 0) break;

    // Only apply candidates that contain no other candidate. The next iteration can then rebuild
    // an enclosing setter from text that already includes every migrated nested call.
    const innermost = candidates.filter(
      (candidate) =>
        !candidates.some(
          (other) =>
            other !== candidate &&
            other.start > candidate.start &&
            other.end < candidate.end,
        ),
    );
    for (const candidate of innermost.sort((a, b) => b.start - a.start)) {
      output =
        output.slice(0, candidate.start) +
        candidate.replacement +
        output.slice(candidate.end);
    }
    changed = true;
  }

  return { output, changed };
}

interface SetterCallRange extends SourceRange {
  setter: string;
}

/** Lists every balanced call to a proven setter in lexical order, including concise callbacks. */
function storeSetterCallRanges(source: string, bindings: StoreBindings): SetterCallRange[] {
  const calls: SetterCallRange[] = [];
  for (const setter of bindings.setters) {
    const pattern = new RegExp(`\\b${escapeRegExp(setter)}\\s*\\(`, "g");
    for (const match of source.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const open = source.indexOf("(", match.index + setter.length);
      const close = matchingParen(source, open);
      if (close !== -1) calls.push({ setter, start: match.index, end: close + 1 });
    }
  }
  return calls.sort((a, b) => a.start - b.start);
}

/** Converts a tree-sitter line/column position to the source-string index used by text scans. */
function sourceIndexAt(source: string, line: number, column: number): number {
  let index = 0;
  for (let current = 0; current < line; current += 1) {
    const newline = source.indexOf("\n", index);
    if (newline === -1) return source.length;
    index = newline + 1;
  }
  return index + column;
}

/**
 * Reapplies flush requirements after fixed-point rewriting. An ancestor edit can overwrite a
 * child setter edit, so targets are tracked by the setter's stable lexical ordinal, not offsets.
 */
function wrapRequiredStoreFlushes(
  source: string,
  bindings: StoreBindings,
  targets: Set<string>,
): string {
  if (targets.size === 0) return source;
  const calls = storeSetterCallRanges(source, bindings);
  const ordinals = new Map<string, number>();
  const edits: Array<{ start: number; end: number; text: string }> = [];
  for (const call of calls) {
    const ordinal = ordinals.get(call.setter) ?? 0;
    ordinals.set(call.setter, ordinal + 1);
    if (!targets.has(`${call.setter}\0${ordinal}`)) continue;
    const prefix = source.slice(Math.max(0, call.start - 80), call.start);
    // A surviving structural AST edit already supplied the required wrapper.
    if (/flush\s*\(\s*\(\s*\)\s*=>\s*$/.test(prefix)) continue;
    let end = call.end;
    while (/[ \t]/.test(source[end] ?? "")) end += 1;
    if (source[end] === ";") end += 1;
    const callText = source.slice(call.start, call.end);
    edits.push({ start: call.start, end, text: `flush(() => ${callText});` });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/** Renames only one-argument calls of an imported helper, preserving unsupported overloads. */
function rewriteSingleArgumentCalls(source: string, localName: string, replacement: string): string {
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const pattern = new RegExp(`\\b${localName}\\s*\\(`, "g");
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + localName.length);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    const args = splitTopLevel(source.slice(open + 1, close));
    if (args.length !== 1) continue;
    edits.push({ start: match.index, end: match.index + localName.length, text: replacement });
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return output;
}

/** Adds Solid 2's default `"id"` key to one-argument reconcile calls and leaves other arities alone. */
function addDefaultReconcileKey(source: string, localName: string): string {
  const edits: Array<{ start: number; text: string }> = [];
  const pattern = new RegExp(`\\b${localName}\\s*\\(`, "g");
  for (const match of source.matchAll(pattern)) {
    if (match.index === undefined) continue;
    const open = source.indexOf("(", match.index + localName.length);
    const close = matchingParen(source, open);
    if (close === -1) continue;
    if (splitTopLevel(source.slice(open + 1, close)).length === 1) {
      edits.push({ start: close, text: ', "id"' });
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.start);
  }
  return output;
}

/** Recognizes imported createEffect calls with exactly one top-level argument. */
function isOneArgumentEffect(statement: string, effectNames: Set<string>): boolean {
  const call = statement.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (!call || !effectNames.has(call[1])) return false;
  const open = statement.indexOf("(", call[1].length);
  const close = matchingParen(statement, open);
  if (close === -1) return false;

  let depth = 0;
  for (let index = open + 1; index < close; index += 1) {
    const char = statement[index];
    if (char === "(" || char === "{" || char === "[") depth += 1;
    else if (char === ")" || char === "}" || char === "]") depth -= 1;
    else if (char === "," && depth === 0) return false;
  }
  return true;
}

/**
 * Rebuilds effect review markers after structural edits have committed. Keeping marker insertion
 * out of the AST edit batch avoids overlapping an outer effect replacement with nested setter
 * replacements, which previously deferred those nested migrations until a second pass.
 */
function reconcileEffectMarkers(
  source: string,
  bindings: StoreBindings,
  effectNames: Set<string>,
): string {
  let output = source.replace(
    new RegExp(`^[ \\t]*${escapeRegExp(EFFECT_TODO)}\\r?\\n`, "gm"),
    "",
  );
  const edits: Array<{ start: number; text: string }> = [];
  for (const effectName of effectNames) {
    const pattern = new RegExp(`\\b${escapeRegExp(effectName)}\\s*\\(`, "g");
    for (const match of output.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const lineStart = output.lastIndexOf("\n", match.index) + 1;
      const indent = output.slice(lineStart, match.index);
      if (!/^[ \\t]*$/.test(indent)) continue;
      const open = output.indexOf("(", match.index + effectName.length);
      const close = matchingParen(output, open);
      if (close === -1) continue;
      let end = close + 1;
      while (/[ \\t]/.test(output[end] ?? "")) end += 1;
      if (output[end] !== ";") continue;
      const statement = output.slice(match.index, end + 1);
      if (
        isOneArgumentEffect(statement, effectNames) &&
        splitSingleCallEffect(statement, bindings, effectNames, indent) === null
      ) {
        edits.push({ start: match.index, text: `${EFFECT_TODO}\n${indent}` });
      }
    }
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.start);
  }
  return output;
}

interface SplitEffectResult {
  deep: boolean;
  output: string;
}

/**
 * Splits a safe one-call effect into Solid 2 compute/apply phases and deep-tracks store paths.
 * Multi-statement, non-arrow, or otherwise ambiguous effects return null for blocker handling.
 */
function splitSingleCallEffect(
  statement: string,
  bindings: StoreBindings,
  effectNames: Set<string>,
  indent: string,
): SplitEffectResult | null {
  if (!isOneArgumentEffect(statement, effectNames)) return null;
  const effectName = statement.match(/^([A-Za-z_$][\w$]*)/)?.[1];
  if (!effectName) return null;
  const open = statement.indexOf("(");
  const close = matchingParen(statement, open);
  if (close === -1) return null;
  const argument = statement.slice(open + 1, close).trim();
  const arrow = argument.match(/^\(\s*\)\s*=>\s*([\s\S]+)$/);
  if (!arrow) return null;
  let body = arrow[1].trim();
  let blockComments: string[] = [];
  let wasBlock = false;
  if (body.startsWith("{") && body.endsWith("}")) {
    wasBlock = true;
    body = body.slice(1, -1).trim();
    blockComments = [...body.matchAll(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g)].map((match) => match[0].trim());
    const statements = body
      .replace(/\/\/[^\n]*/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    // A block must contain exactly one statement; broader control flow requires human judgment.
    if (!statements.endsWith(";") || statements.slice(0, -1).includes(";")) return null;
    body = statements.slice(0, -1).trim();
  }
  const call = body.match(/^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/);
  if (!call) return null;
  const callOpen = body.indexOf("(", call[0].length - 1);
  const callClose = matchingParen(body, callOpen);
  if (callClose !== body.length - 1) return null;
  const args = splitTopLevel(body.slice(callOpen + 1, callClose));
  if (args.length === 0) return null;
  const storeNames = bindings.stores;
  let usesDeep = false;
  const trackedArgs = args.map((arg) => {
    const root = arg.match(/^([A-Za-z_$][\w$]*)\./)?.[1];
    // Only proven store member chains need deep tracking; ordinary accessors retain normal reads.
    if (root && storeNames.has(root) && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+$/.test(arg)) {
      usesDeep = true;
      return `deep(${arg})`;
    }
    return arg;
  });
  const computedArgs = trackedArgs.map((arg) => {
    const trimmed = arg.trim();
    // Arrow concise bodies interpret `{ ... }` as blocks. Parenthesize object literals so the
    // compute phase returns the value that the apply phase receives.
    return trimmed.startsWith("{") && trimmed.endsWith("}") ? `(${arg})` : arg;
  });
  if (args.length === 1) {
    const memberName = usesDeep ? args[0].match(/\.([A-Za-z_$][\w$]*)$/)?.[1] : undefined;
    const valueName = memberName && !/^(?:await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|implements|import|in|instanceof|interface|let|new|null|package|private|protected|public|return|static|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)$/.test(memberName)
      ? memberName
      : "value";
    if (wasBlock && (usesDeep || blockComments.length > 0)) {
      const comments = blockComments.length > 0 ? `${blockComments.join(`\n${indent}`)}\n${indent}` : "";
      return {
        deep: usesDeep,
        output: `${comments}${effectName}(\n${indent}  () => ${computedArgs[0]},\n${indent}  (${valueName}) => ${call[1]}(${valueName}),\n${indent});`,
      };
    }
    return {
      deep: usesDeep,
      output: `${effectName}(() => ${computedArgs[0]}, (${valueName}) => ${call[1]}(${valueName}));`,
    };
  }
  const values = args.map((_, index) => `value${index}`);
  return {
    deep: usesDeep,
    output: `${effectName}(\n${indent}  () => [${computedArgs.join(", ")}] as const,\n${indent}  ([${values.join(", ")}]) => ${call[1]}(${values.join(", ")}),\n${indent});`,
  };
}

/** Preserves a consistently CRLF- or LF-authored file after generated snippets add new lines. */
function restoreLineEndings(source: string, output: string): string {
  const crlf = source.match(/\r\n/g)?.length ?? 0;
  const lf = source.match(/(?<!\r)\n/g)?.length ?? 0;
  if (crlf > 0 && lf === 0) return output.replace(/\r?\n/g, "\r\n");
  if (lf > 0 && crlf === 0) return output.replace(/\r\n/g, "\n");
  return output;
}

/** Returns whether a statement is nested in a call to one of the supplied imported bindings. */
function isInsideCall(statement: SgNode<TSX>, localNames: Set<string>): boolean {
  return statement.ancestors().some((ancestor: { kind(): string; text(): string }) => {
    if (ancestor.kind() !== "call_expression") return false;
    const callee = ancestor.text().match(/^([A-Za-z_$][\w$]*)\s*\(/)?.[1];
    return callee !== undefined && localNames.has(callee);
  });
}

interface LifecycleRewrite {
  output: string | null;
}

/**
 * Converts one imported onMount call only when it contains exactly one top-level imported
 * onCleanup call whose argument is a zero-argument arrow. Other control flow is blocked.
 */
function rewriteMountedCleanup(
  statement: string,
  mountNames: Set<string>,
  cleanupNames: Set<string>,
): LifecycleRewrite {
  const call = statement.match(/^([A-Za-z_$][\w$]*)\s*\(/);
  if (!call || !mountNames.has(call[1])) return { output: null };
  const open = statement.indexOf("(", call[1].length);
  const close = matchingParen(statement, open);
  if (close === -1 || statement.slice(close + 1).trim() !== ";") return { output: null };
  const argument = statement.slice(open + 1, close).trim();
  const arrow = argument.match(/^\(\s*\)\s*=>\s*\{/);
  if (!arrow) return { output: null };
  const bodyOpen = argument.indexOf("{", arrow[0].length - 1);
  const bodyClose = findBalancedEnd(argument, bodyOpen, "{", "}");
  if (bodyClose !== argument.length - 1) return { output: null };

  const body = argument.slice(bodyOpen + 1, bodyClose);
  const cleanupCalls: Array<{ start: number; end: number; callback: string }> = [];
  for (const cleanupName of cleanupNames) {
    const pattern = new RegExp(`\\b${escapeRegExp(cleanupName)}\\s*\\(`, "g");
    for (const match of body.matchAll(pattern)) {
      if (match.index === undefined) continue;
      const cleanupOpen = body.indexOf("(", match.index + cleanupName.length);
      const cleanupClose = matchingParen(body, cleanupOpen);
      if (cleanupClose === -1) continue;
      const callback = body.slice(cleanupOpen + 1, cleanupClose).trim();
      if (!/^\(\s*\)\s*=>/.test(callback)) continue;
      const lineStart = body.lastIndexOf("\n", match.index) + 1;
      if (body.slice(lineStart, match.index).trim() !== "") continue;
      let end = cleanupClose + 1;
      while (/\s/.test(body[end] ?? "") && body[end] !== "\n" && body[end] !== "\r") end += 1;
      if (body[end] !== ";") continue;
      cleanupCalls.push({ start: match.index, end: end + 1, callback });
    }
  }
  if (cleanupCalls.length !== 1) return { output: null };
  const cleanup = cleanupCalls[0];
  const rewrittenBody = `${body.slice(0, cleanup.start)}return ${cleanup.callback};${body.slice(cleanup.end)}`;
  return { output: `onSettled(() => {${rewrittenBody}});` };
}

/**
 * Runs the Solid 1-to-2 first pass for one TSX file.
 * ast-grep supplies structural expression-statement nodes for safe replacements; subsequent
 * import-aware text passes handle bounded JSX/declaration shapes and return null on a no-op.
 */
const codemod: Codemod<TSX> = async (root) => {
  const program = root.root();
  const original = program.text();
  // ast-grep edits refer to original node ranges and are committed together after traversal.
  const edits = [];
  const flags: TransformFlags = {
    deep: false,
    flush: false,
    forComponent: false,
    isPending: false,
    omit: false,
    onSettled: false,
    snapshot: false,
    storePath: false,
    untrack: false,
    importReplacements: new Map(),
  };
  const storeBindings = discoverStoreBindings(original);
  const originalSetterCalls = storeSetterCallRanges(original, storeBindings);
  const originalSetterOrdinals = new Map<number, string>();
  const setterOrdinalCounts = new Map<string, number>();
  for (const call of originalSetterCalls) {
    const ordinal = setterOrdinalCounts.get(call.setter) ?? 0;
    setterOrdinalCounts.set(call.setter, ordinal + 1);
    originalSetterOrdinals.set(call.start, `${call.setter}\0${ordinal}`);
  }
  const requiredFlushTargets = new Set<string>();
  const effectNames = new Set(importedLocalNames(original, "solid-js", "createEffect"));
  const mountNames = new Set(importedLocalNames(original, "solid-js", "onMount"));
  const cleanupNames = new Set(importedLocalNames(original, "solid-js", "onCleanup"));
  const synchronousBoundaryNames = new Set([
    ...importedLocalNames(original, "solid-js", "batch"),
    ...importedLocalNames(original, "solid-js", "flush"),
  ]);

  // `kind` is a tree-sitter node type, so nested calls are visited as complete statements.
  for (const statement of program.findAll({ rule: { kind: "expression_statement" } })) {
    const text = statement.text();
    const indent = " ".repeat(statement.range().start.column);
    const splitEffect = splitSingleCallEffect(text, storeBindings, effectNames, indent);
    if (splitEffect) {
      edits.push(statement.replace(splitEffect.output));
      flags.deep ||= splitEffect.deep;
      continue;
    }

    const migratedStoreSetter = migrateStoreSetterCall(text, storeBindings);
    if (migratedStoreSetter) {
      const next = statement.next();
      const setter = text.match(/^([A-Za-z_$][\w$]*)/)?.[1];
      const store = setter ? storeBindings.setterToStore.get(setter) : undefined;
      // A following read of the same store must observe the update synchronously via `flush`.
      if (
        store &&
        next &&
        new RegExp(`\\b${store}\\b`).test(next.text()) &&
        !isInsideCall(statement, synchronousBoundaryNames)
      ) {
        const range = statement.range().start;
        const originalStart = sourceIndexAt(original, range.line, range.column);
        const target = originalSetterOrdinals.get(originalStart);
        if (target) requiredFlushTargets.add(target);
        edits.push(statement.replace(`flush(() => ${migratedStoreSetter.replace(/;$/, "")});`));
        flags.flush = true;
      } else {
        edits.push(statement.replace(migratedStoreSetter));
      }
      flags.storePath = true;
      continue;
    }

    const lifecycle = rewriteMountedCleanup(text, mountNames, cleanupNames);
    if (lifecycle.output) {
      edits.push(statement.replace(lifecycle.output));
      flags.onSettled = true;
      continue;
    }
    if (mountNames.has(text.match(/^([A-Za-z_$][\w$]*)\s*\(/)?.[1] ?? "")) {
      const marked = `${LIFECYCLE_BLOCKER}\n${indent}${text}`;
      const markedCrlf = `${LIFECYCLE_BLOCKER}\r\n${indent}${text}`;
      if (!original.includes(marked) && !original.includes(markedCrlf)) {
        edits.push(statement.replace(marked));
      }
      continue;
    }

    // Unsupported effects are marked after nested structural edits commit to avoid overlapping edits.
  }

  // Apply all AST-selected replacements atomically so their original ranges cannot drift.
  let output = edits.length > 0 ? program.commitEdits(edits) : original;
  const nestedSetters = rewriteNestedStoreSetters(output, storeBindings);
  output = nestedSetters.output;
  flags.storePath ||= nestedSetters.changed;
  output = wrapRequiredStoreFlushes(output, storeBindings, requiredFlushTargets);
  flags.flush ||= requiredFlushTargets.size > 0;
  output = reconcileEffectMarkers(output, storeBindings, effectNames);
  for (const localName of importedLocalNames(output, "solid-js/store", "unwrap")) {
    const next = rewriteSingleArgumentCalls(output, localName, "snapshot");
    if (next !== output) flags.snapshot = true;
    output = next;
  }
  for (const localName of importedLocalNames(output, "solid-js/store", "reconcile")) {
    output = addDefaultReconcileKey(output, localName);
  }

  for (const localName of importedLocalNames(output, "solid-js", "Index")) {
    output = rewriteIndexCallbackObjectReads(output, localName);
    const rewritten = rewritePairedJsxElements(output, localName, "For", "keyed={false}");
    output = rewritten.output;
    flags.forComponent ||= rewritten.count > 0;
  }

  for (const localName of importedLocalNames(output, "solid-js", "splitProps")) {
    const rewritten = rewriteSplitPropsDeclarations(output, localName);
    output = rewritten.output;
    flags.omit ||= rewritten.count > 0;
  }

  for (const context of discoverContextBindings(output)) {
    output = rewritePairedJsxElements(output, `${context}.Provider`, context).output;
  }
  const asyncApis = rewriteAsyncApis(output);
  output = asyncApis.output;
  for (const [binding, replacement] of asyncApis.imports) {
    flags.importReplacements.set(binding, replacement);
  }
  flags.isPending = /\bisPending\s*\(/.test(output);
  for (const localName of importedLocalNames(output, "solid-js", "createSelector")) {
    output = rewriteSelectorDeclarations(output, localName);
  }
  output = rewriteDomClassComposition(output);
  output = rewriteEnumeratedBooleanAttributes(output);
  const localDirectiveFactories = discoverLocalDirectiveFactories(output);
  const directives = rewriteDirectiveUsages(output, localDirectiveFactories);
  output = rewriteDirectiveFactories(directives.output, directives.names);
  if (directives.names.size > 0) output = removeLegacyDirectiveAugmentation(output);
  if (directives.blocked && !output.includes(DIRECTIVE_BLOCKER)) {
    output = `${DIRECTIVE_BLOCKER}\n${output}`;
  }
  for (const localName of importedLocalNames(output, "solid-js", "createSignal")) {
    const rewritten = rewriteReactiveSignalInitializers(output, localName);
    flags.untrack ||= rewritten !== output;
    output = rewritten;
  }
  output = rewriteImports(output, flags);
  output = restoreLineEndings(original, output);

  // Codemod's null convention records a true no-op and is essential to idempotent workflows.
  return output === original ? null : output;
};

export default codemod;
