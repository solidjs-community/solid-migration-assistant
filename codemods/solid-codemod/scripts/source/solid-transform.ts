import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { applyDirectMigrations } from "./direct-migrations.ts";
import {
  importSourceReplacements,
  removedDomDirectivePrefixes,
  rendererTypeNames,
  reviewOnlyNames,
  safeImportRenames,
  solidTypeRenames,
  webReviewOnlyNames,
  webSafeImportRenames,
} from "./solid-api.ts";

type SourceLanguage = TSX;
type SourceNode = SgNode<SourceLanguage>;

interface JsxComponentRename {
  localName: string;
  replacementName: string;
  addKeyedFalse: boolean;
  rewriteRevealProps: boolean;
  rewriteErrorFallback: boolean;
}

const codemod: Codemod<SourceLanguage> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];
  const editsByRange = new Map<string, Edit>();
  const usageRenames = new Map<string, string>();
  const jsxComponentRenames: JsxComponentRename[] = [];
  const semanticReviewNames = new Set<string>();
  const contextNames = new Set<string>();
  const contextDeclaratorIds = new Set<number>();
  const source = root.source();
  const fileName = root.relativeFilename();
  const isTestLikeFile =
    /(?:^|[\/])(?:test|tests|__tests__)(?:[\/]|$)|(?:\.test|\.spec)\.[cm]?[jt]sx?$/.test(fileName) ||
    /\bfrom\s+["']vitest["']/.test(source);
  let insertedSemanticReviewMarker = source.includes("TODO(solid-2): Review semantic migration sites");
  let classNameHelperName = "__solid2ClassName";
  for (let i = 2; new RegExp(`\b${classNameHelperName}\b`).test(source); i += 1) {
    classNameHelperName = `__solid2ClassName${i}`;
  }
  let needsClassNameHelper = false;

  const mergeSolidFlushSpecifier = (insertedText: string): string | null => {
    if (/flush/.test(insertedText)) return null;
    const pattern = /import\s+\{([^}]*)\}\s+from\s+["']solid-js["'];/;
    if (!pattern.test(insertedText)) return null;
    return insertedText.replace(pattern, (match: string, specifiers: string) => {
      const quote = match.includes("'solid-js'") ? "'" : '"';
      const nextSpecifiers = specifiers.trim().length > 0 ? `${specifiers.trim()}, flush` : "flush";
      return `import { ${nextSpecifiers} } from ${quote}solid-js${quote};`;
    });
  };

  const addEdit = (edit: Edit): void => {
    const key = `${edit.startPos}:${edit.endPos}`;
    const existing = editsByRange.get(key);
    if (existing) {
      if (/flush/.test(edit.insertedText)) {
        const merged = mergeSolidFlushSpecifier(existing.insertedText);
        if (merged) existing.insertedText = merged;
      }
      return;
    }
    editsByRange.set(key, edit);
    edits.push(edit);
  };

  const replaceNode = (node: SourceNode, insertedText: string): Edit => ({
    startPos: node.range().start.index,
    endPos: node.range().end.index,
    insertedText,
  });

  const moduleNameFromString = (node: SourceNode): string | null => {
    const text = node.text();
    if (text.length < 2) return null;
    const quote = text[0];
    if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) {
      return null;
    }
    return text.slice(1, -1);
  };

  const jsxAttribute = (node: SourceNode, name: string): SourceNode | null => {
    const attributes = node.fieldChildren("attribute");
    for (const attribute of attributes) {
      if (attribute.kind() !== "jsx_attribute") continue;
      const attributeName = attribute.children().find((child: SourceNode) => child.kind() === "property_identifier" || child.kind() === "jsx_namespace_name");
      if (attributeName?.text() === name) return attribute;
    }
    return null;
  };

  const jsxAttributeValue = (attribute: SourceNode, name: string): string => {
    const text = attribute.text().trim();
    const value = text.slice(name.length).trim();
    if (!value.startsWith("=")) return "true";
    const raw = value.slice(1).trim();
    if (raw.startsWith("{") && raw.endsWith("}")) return raw.slice(1, -1).trim();
    return raw;
  };

  const insertBeforeJsxTagClose = (node: SourceNode, insertedText: string): Edit => {
    const text = node.text();
    const offset = text.endsWith("/>") ? 2 : 1;
    const index = node.range().end.index - offset;
    return { startPos: index, endPos: index, insertedText };
  };

  const removeJsxAttribute = (node: SourceNode): Edit => {
    const range = node.range();
    const start = range.start.index;
    const end = range.end.index;
    const lineStart = source.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextNewline = source.indexOf("\n", end);
    const lineEnd = nextNewline === -1 ? source.length : nextNewline;
    const beforeOnLine = source.slice(lineStart, start);
    const afterOnLine = source.slice(end, lineEnd);

    if (/^\s*$/.test(beforeOnLine) && /^\s*$/.test(afterOnLine)) {
      return {
        startPos: lineStart,
        endPos: nextNewline === -1 ? lineEnd : nextNewline + 1,
        insertedText: "",
      };
    }

    let startPos = start;
    let endPos = end;
    if (startPos > 0 && /[ 	]/.test(source[startPos - 1] ?? "")) {
      startPos -= 1;
    } else if (endPos < source.length && /[ 	]/.test(source[endPos] ?? "")) {
      endPos += 1;
    }
    return { startPos, endPos, insertedText: "" };
  };

  const specifierText = (specifier: SourceNode, importedName: string, aliasName: string | null, typeOnlyImport: boolean): string => {
    const inlineType = specifier.text().trim().startsWith("type ");
    const typePrefix = !typeOnlyImport && inlineType ? "type " : "";
    if (aliasName) return `${typePrefix}${importedName} as ${aliasName}`;
    return `${typePrefix}${importedName}`;
  };

  const specifierIsTypeOnly = (specifier: SourceNode, typeOnlyImport: boolean): boolean => {
    return typeOnlyImport || specifier.text().trim().startsWith("type ");
  };

  const uniqueStrings = (values: string[]): string[] => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const value of values) {
      if (seen.has(value)) continue;
      seen.add(value);
      result.push(value);
    }
    return result;
  };

  const removedCoreStubNames = new Set([
    "",
    "",
    "",
    "DEV",
    "EffectFunction",
    "InitializedResource",
    "InitializedResourceReturn",
    "MemoOptions",
    "OnEffectFunction",
    "OnOptions",
    "ResolvedJSXElement",
    "Resource",
    "ResourceActions",
    "ResourceFetcher",
    "ResourceFetcherInfo",
    "ResourceOptions",
    "ResourceReturn",
    "ResourceSource",
    "ReconcileOptions",
    "Transition",
    "cancelCallback",
    "catchError",
    "createComputed",
    "createDeferred",
    "createEffect",
    "createDynamic",
    "createMutable",
    "createReaction",
    "createRenderEffect",
    "createResource",
    "createSelector",
    "enableExternalSource",
    "enableScheduling",
    "from",
    "indexArray",
    "modifyMutable",
    "observable",
    "on",
    "onError",
    "produce",
    "requestCallback",
    "resetErrorBoundaries",
    "splitProps",
    "startTransition",
    "useTransition",
    "writeSignal",
  ]);

  const removedNamespaceStubNames = new Set([
    "catchError",
    "createComputed",
    "createDeferred",
    "createEffect",
    "createDynamic",
    "createMutable",
    "createReaction",
    "createRenderEffect",
    "createResource",
    "createSelector",
    "enableExternalSource",
    "enableScheduling",
    "from",
    "indexArray",
    "modifyMutable",
    "observable",
    "on",
    "onError",
    "requestCallback",
    "resetErrorBoundaries",
    "splitProps",
    "startTransition",
    "useTransition",
    "writeSignal",
  ]);

  const reviewStubDeclaration = (localName: string, importedName: string, typeOnlySpecifier: boolean): string => {
    if (importedName === "Signal") return "type " + localName + "<T = any> = [() => T, (value: T | ((prev: T) => T)) => unknown];";
    if (typeOnlySpecifier) return "type " + localName + "<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };";

    const callablePrevious = "(fn: (previous?: any) => any, value?: any, options?: any) => any";
    const callablePreviousRuntime = "((fn: (previous?: any) => any, value?: any) => fn(value)) as any";
    const createEffectImportName = localName === "createEffect" ? "__solid2CreateEffect" : `__solid2CreateEffect_${localName}`;
    const createEffectIsServerName = localName === "createEffect" ? "__solid2IsServer" : `__solid2IsServer_${localName}`;
    const createEffectRuntime = `import { createEffect as ${createEffectImportName} } from "solid-js";
import { isServer as ${createEffectIsServerName} } from "@solidjs/web";
const ${localName}: ${callablePrevious} = ((fn: (previous?: any) => any, value?: any, options?: any) => { if (${createEffectIsServerName}) return undefined as any; let previous = value; return ${createEffectImportName}(() => fn(previous), (next: any) => { previous = next; }, options); }) as any;`;
    const createResourceEffectName = localName === "createResource" ? "__solid2CreateResourceEffect" : `__solid2CreateResourceEffect_${localName}`;
    const createResourceSignalName = localName === "createResource" ? "__solid2CreateResourceSignal" : `__solid2CreateResourceSignal_${localName}`;
    const createResourceIsServerName = localName === "createResource" ? "__solid2CreateResourceIsServer" : `__solid2CreateResourceIsServer_${localName}`;
    const createResourceRuntime = `import { createEffect as ${createResourceEffectName}, createSignal as ${createResourceSignalName} } from "solid-js";
import { isServer as ${createResourceIsServerName} } from "@solidjs/web";
const ${localName}: { (source: any, fetcher: (value: any, info: any) => any, options?: any): any; (fetcher: (...args: any[]) => any, options?: any): any } = ((source: any, fetcher?: any, options?: any) => { const hasSource = typeof fetcher === "function"; const actualSource = hasSource ? source : undefined; const actualFetcher = hasSource ? fetcher : source; const actualOptions = hasSource ? options : fetcher ?? options; let latest = actualOptions?.initialValue; const [readLatest, setLatest] = ${createResourceSignalName}(latest as any, { ownedWrite: true }); const [readError, setError] = ${createResourceSignalName}<any>(undefined, { ownedWrite: true }); const [readLoading, setLoading] = ${createResourceSignalName}<boolean>(false, { ownedWrite: true }); const resource: any = () => { const error = readError(); if (error) throw error; return readLatest(); }; Object.defineProperty(resource, "latest", { get: () => readLatest() }); Object.defineProperty(resource, "error", { get: () => readError() }); Object.defineProperty(resource, "loading", { get: () => readLoading() }); Object.defineProperty(resource, "state", { get: () => readError() ? "errored" : readLoading() ? "pending" : readLatest() === undefined ? "unresolved" : "ready" }); const mutate = (value: any) => { setError(undefined as any); const next = typeof value === "function" ? value(latest) : value; latest = next; setLatest(() => next); return next; }; const fail = (err: any) => { setError(() => err); return undefined; }; const readSource = () => typeof actualSource === "function" ? actualSource() : actualSource; let requestId = 0; const run = (input: any, refetching?: any) => { if (hasSource && input === undefined) { setLoading(false); return Promise.resolve(undefined); } setLoading(true); const id = ++requestId; return Promise.resolve(typeof actualFetcher === "function" ? actualFetcher(input, { value: latest, refetching }) : input).then(value => { if (id === requestId) { setLoading(false); return mutate(value); } return value; }, err => { if (id === requestId) { setLoading(false); return fail(err); } return undefined; }); }; const refetch = function(value?: any) { const input = hasSource ? readSource() : arguments.length > 0 ? value : undefined; const refetching = arguments.length > 0 ? value : undefined; return run(input, refetching); }; if (!${createResourceIsServerName} && hasSource) { let previousInput = readSource(); if (previousInput !== undefined) void run(previousInput); ${createResourceEffectName}(() => readSource(), (input: any) => { if (input === previousInput) return; previousInput = input; void run(input); }); } else if (!${createResourceIsServerName}) void refetch(); return [resource, { mutate, refetch }]; }) as any;`;
    const valueStubs = new Map<string, string>([
      ["createResource", createResourceRuntime],
      ["createDeferred", "const " + localName + ": (source: any, options?: any) => (() => any) = undefined as any;"],
      ["createSelector", "const " + localName + ": (source: any, fn?: any, options?: any) => (key: any) => boolean = undefined as any;"],
      ["useTransition", "const " + localName + ": () => [() => boolean, (fn: () => any) => any] = undefined as any;"],
      ["startTransition", "const " + localName + ": (fn: () => any) => any = ((fn: () => any) => fn()) as any;"],
      ["createEffect", createEffectRuntime],
      ["createRenderEffect", "const " + localName + ": " + callablePrevious + " = " + callablePreviousRuntime + ";"],
      ["createComputed", "const " + localName + ": " + callablePrevious + " = " + callablePreviousRuntime + ";"],
      ["createReaction", "const " + localName + ": (fn: (...args: any[]) => any, options?: any) => (tracker: any) => any = undefined as any;"],
      ["createRoot", "const " + localName + ": <T = any>(fn: (dispose: () => void) => T, options?: any) => T = ((fn: (dispose: () => void) => unknown) => fn(() => undefined)) as any;"],
      ["effect", "const " + localName + ": " + callablePrevious + " = " + callablePreviousRuntime + ";"],
      ["on", "const " + localName + ": (deps: any, fn: (input: any, previousInput: any, previous?: any) => any, options?: any) => any = ((deps: any, fn: (input: any, previousInput: any, previous?: any) => any) => (previous?: any) => { const input = typeof deps === \"function\" ? deps() : Array.isArray(deps) ? deps.map((dep: any) => typeof dep === \"function\" ? dep() : dep) : deps; return fn(input, undefined, previous); }) as any;"],
      ["splitProps", "const " + localName + ": (props: any, ...keyGroups: any[]) => any = ((props: any, ...keyGroups: any[]) => { const picked = new Set<any>(); const groups = keyGroups.map((group: any) => { const out: any = {}; for (const key of group ?? []) { picked.add(key); Object.defineProperty(out, key, { enumerable: true, configurable: true, get: () => props[key] }); } return out; }); const rest = new Proxy({}, { get: (_target, key: any) => picked.has(key) ? undefined : props[key], has: (_target, key: any) => !picked.has(key) && key in props, ownKeys: () => Reflect.ownKeys(props).filter((key: any) => !picked.has(key)), getOwnPropertyDescriptor: (_target, key: any) => picked.has(key) || !(key in props) ? undefined : { enumerable: true, configurable: true } }); return [...groups, rest]; }) as any;"],
      ["enableExternalSource", "const " + localName + ": (factory: (track: any, trigger: any) => any) => any = undefined as any;"],
      ["from", "const " + localName + ": <T = any>(producer: (set: (value: T) => void) => any, initial?: T) => any = undefined as any;"],
      ["observable", "const " + localName + ": (input: any) => any = undefined as any;"],
      ["onError", "const " + localName + ": (fn: (...args: any[]) => any) => any = undefined as any;"],
      ["catchError", "const " + localName + ": (fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => any = ((fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => { try { return fn(); } catch (err) { return handler ? handler(err) : undefined; } }) as any;"],
      ["requestCallback", "const " + localName + ": (fn: () => any, options?: any) => any = undefined as any;"],
      ["cancelCallback", "const " + localName + ": (task: any) => any = undefined as any;"],
      ["getPropAlias", "const " + localName + ": (name: any, tag?: any) => any = undefined as any;"],
      ["setBoolAttribute", "const " + localName + ": (node: any, name: any, value: any) => any = undefined as any;"],
      ["clearDelegatedEvents", "const " + localName + ": () => any = undefined as any;"],
      ["ssrSpread", "const " + localName + ": (...args: any[]) => any = undefined as any;"],
      ["use", "const " + localName + ": <T extends Element, A extends unknown[], R>(fn: (element: T, ...args: A) => R, element: T, ...args: A) => R = undefined as any;"],
    ]);

    return valueStubs.get(importedName) ?? "const " + localName + " = undefined as any;";
  };

  const namedImportBindingKey = (moduleName: string, importedName: string, aliasName: string | null, typeOnlySpecifier: boolean): string => {
    return `${moduleName}:${typeOnlySpecifier ? "type" : "value"}:${importedName}:${aliasName ?? importedName}`;
  };

  const memberExpressionParts = (node: SourceNode): { objectNode: SourceNode | null; propertyNode: SourceNode | null } => {
    const children = node.children();
    return {
      objectNode: node.field("object") ?? children.find((child) => child.kind() === "identifier") ?? null,
      propertyNode: node.field("property") ?? children.find((child) => child.kind() === "property_identifier") ?? null,
    };
  };

  const namespaceModule = (node: SourceNode | null, namespaces: Map<string, string>): string | null => {
    if (!node || node.kind() !== "identifier") return null;
    if (isLocallyShadowed(node, node.text())) return null;
    return namespaces.get(node.text()) ?? null;
  };

  const isSolidCoreModule = (moduleName: string | null): boolean => moduleName === "solid-js" || moduleName === "solid-js/store";
  const isSolidWebModule = (moduleName: string | null): boolean => moduleName === "solid-js/web" || moduleName === "@solidjs/web";

  const isFunctionLike = (node: SourceNode): boolean => {
    const kind = node.kind();
    return (
      kind === "function_declaration" ||
      kind === "function_expression" ||
      kind === "generator_function_declaration" ||
      kind === "generator_function" ||
      kind === "arrow_function"
    );
  };

  const bindingPatternContainsName = (node: SourceNode, name: string): boolean => {
    const kind = node.kind();
    if ((kind === "identifier" || kind === "shorthand_property_identifier_pattern") && node.text() === name) return true;

    const bindingPatternKinds = new Set([
      "array_pattern",
      "object_pattern",
      "pair_pattern",
      "rest_pattern",
      "assignment_pattern",
    ]);
    if (!bindingPatternKinds.has(kind)) return false;

    return node.children().some((child) => bindingPatternContainsName(child, name));
  };

  const parameterShadowsName = (parameter: SourceNode, name: string): boolean => {
    const bindingNode = parameter.field("pattern") ?? parameter.field("name");
    if (bindingNode) return bindingPatternContainsName(bindingNode, name);
    return parameter.children().some((child) => bindingPatternContainsName(child, name));
  };

  const functionParametersShadowName = (node: SourceNode, name: string): boolean => {
    const parameters = node.field("parameters") ?? node.children().find((child) => child.kind() === "formal_parameters") ?? null;
    if (parameters) {
      if (parameters.kind() === "identifier") return parameters.text() === name;
      return parameters.children().some((child) => parameterShadowsName(child, name));
    }

    if (node.kind() !== "arrow_function") return false;
    const firstIdentifier = node.children().find((child) => child.kind() === "identifier") ?? null;
    return firstIdentifier?.text() === name;
  };

  const blockDirectDeclarationShadowsName = (node: SourceNode, name: string, referenceIndex: number): boolean => {
    for (const child of node.children()) {
      const kind = child.kind();
      if (kind === "function_declaration" || kind === "generator_function_declaration" || kind === "class_declaration") {
        const declarationName = child.field("name");
        if (declarationName?.text() === name) return true;
        continue;
      }

      if (child.range().start.index > referenceIndex) continue;
      if (kind !== "lexical_declaration" && kind !== "variable_declaration") continue;

      for (const declarator of child.children().filter((declarationChild) => declarationChild.kind() === "variable_declarator")) {
        const declarationName = declarator.field("name");
        if (declarationName && bindingPatternContainsName(declarationName, name)) return true;
      }
    }
    return false;
  };

  const catchClauseShadowsName = (node: SourceNode, name: string): boolean => {
    const parameter = node.field("parameter") ?? node.children().find((child) => child.kind() === "identifier" || child.kind().endsWith("_pattern")) ?? null;
    return parameter ? bindingPatternContainsName(parameter, name) : false;
  };

  const isLocallyShadowed = (identifier: SourceNode, name: string): boolean => {
    const referenceIndex = identifier.range().start.index;
    for (const ancestor of identifier.ancestors()) {
      const kind = ancestor.kind();
      if (isFunctionLike(ancestor) && functionParametersShadowName(ancestor, name)) return true;
      if ((kind === "program" || kind === "statement_block") && blockDirectDeclarationShadowsName(ancestor, name, referenceIndex)) return true;
      if (kind === "catch_clause" && catchClauseShadowsName(ancestor, name)) return true;
    }
    return false;
  };

  const isShadowedBeforeAncestor = (identifier: SourceNode, name: string, boundary: SourceNode): boolean => {
    const referenceIndex = identifier.range().start.index;
    for (const ancestor of identifier.ancestors()) {
      if (ancestor.id() === boundary.id()) break;
      const kind = ancestor.kind();
      if (isFunctionLike(ancestor) && functionParametersShadowName(ancestor, name)) return true;
      if ((kind === "program" || kind === "statement_block") && blockDirectDeclarationShadowsName(ancestor, name, referenceIndex)) return true;
      if (kind === "catch_clause" && catchClauseShadowsName(ancestor, name)) return true;
    }
    return false;
  };

  const isContextNameShadowed = (identifier: SourceNode, name: string): boolean => {
    const referenceIndex = identifier.range().start.index;
    for (const ancestor of identifier.ancestors()) {
      const kind = ancestor.kind();
      if (isFunctionLike(ancestor) && functionParametersShadowName(ancestor, name)) return true;
      if (kind === "catch_clause" && catchClauseShadowsName(ancestor, name)) return true;
      if (kind !== "program" && kind !== "statement_block") continue;

      for (const child of ancestor.children()) {
        const childKind = child.kind();
        if (childKind === "function_declaration" || childKind === "generator_function_declaration" || childKind === "class_declaration") {
          if (child.field("name")?.text() === name) return true;
          continue;
        }

        if (child.range().start.index > referenceIndex) continue;
        if (childKind !== "lexical_declaration" && childKind !== "variable_declaration") continue;

        for (const declarator of child.children().filter((declarationChild) => declarationChild.kind() === "variable_declarator")) {
          const declarationName = declarator.field("name");
          if (!declarationName || !bindingPatternContainsName(declarationName, name)) continue;
          if (contextDeclaratorIds.has(declarator.id())) continue;
          return true;
        }
      }
    }
    return false;
  };

  const firstParameterName = (node: SourceNode): string | null => {
    const parameters = node.field("parameters") ?? node.children().find((child) => child.kind() === "formal_parameters") ?? null;
    if (parameters) {
      if (parameters.kind() === "identifier") return parameters.text();
      for (const child of parameters.children()) {
        if (child.kind() !== "required_parameter" && child.kind() !== "optional_parameter") continue;
        const name = child.field("name") ?? child.field("pattern") ?? child.children().find((parameterChild) => parameterChild.kind() === "identifier") ?? null;
        if (name?.kind() === "identifier") return name.text();
      }
      return null;
    }

    if (node.kind() !== "arrow_function") return null;
    const firstIdentifier = node.children().find((child) => child.kind() === "identifier") ?? null;
    return firstIdentifier?.text() ?? null;
  };

  const jsxExpressionValue = (attribute: SourceNode): SourceNode | null => {
    const expression = attribute.children().find((child) => child.kind() === "jsx_expression") ?? null;
    if (!expression) return null;
    return expression.children().find((child) => child.kind() !== "{" && child.kind() !== "}") ?? null;
  };

  const callFunction = (call: SourceNode): SourceNode | null => {
    return call.field("function") ?? call.children().find((child) => child.kind() === "identifier" || child.kind() === "member_expression") ?? null;
  };


  const collectTestStatementsNeedingFlush = (signalSetterNames: Set<string>, eventDispatcherNames: Set<string>): SourceNode[] => {
    const statements = new Map<number, SourceNode>();
    const timerMethods = new Set(["advanceTimersByTime", "advanceTimersToNextTimer", "runAllTimers", "runOnlyPendingTimers"]);
    for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
      const callee = callFunction(call);
      let needsFlush = false;
      if (callee?.kind() === "member_expression") {
        const { objectNode, propertyNode } = memberExpressionParts(callee);
        const propertyName = propertyNode?.text();
        needsFlush = ["dispatchEvent", "close"].includes(propertyName ?? "") || (objectNode?.text() === "vi" && !!propertyName && timerMethods.has(propertyName));
      } else if (callee?.kind() === "identifier") {
        const calleeName = callee.text();
        needsFlush =
          (signalSetterNames.has(calleeName) && call.parent()?.kind() === "expression_statement") ||
          eventDispatcherNames.has(calleeName);
      }
      if (!needsFlush) continue;
      const statement = call.ancestors().find((ancestor) => ancestor.kind() === "expression_statement") ?? null;
      if (!statement) continue;
      const afterStatement = source.slice(statement.range().end.index, statement.range().end.index + 120);
      if (/^\s*flush\s*\(/.test(afterStatement)) continue;
      statements.set(statement.id(), statement);
    }
    return Array.from(statements.values());
  };

  const callArguments = (call: SourceNode): SourceNode[] => {
    const args = call.field("arguments") ?? call.children().find((child) => child.kind() === "arguments") ?? null;
    if (!args) return [];
    return args.children().filter((child) => child.isNamed());
  };

  const isAsyncFunctionNode = (node: SourceNode | null): boolean => {
    return Boolean(node && (node.kind() === "arrow_function" || node.kind() === "function_expression") && node.text().trim().startsWith("async"));
  };

  const callbackHasFirstParameter = (node: SourceNode): boolean => {
    const parameters = node.field("parameters") ?? node.children().find((child) => child.kind() === "formal_parameters") ?? null;
    if (parameters) return parameters.kind() === "identifier" || parameters.children().some((child) => child.isNamed());
    if (node.kind() !== "arrow_function") return false;
    return Boolean(node.children().find((child) => child.kind() === "identifier"));
  };

  const isSafeErrorAccessorUse = (identifier: SourceNode): boolean => {
    const parent = identifier.parent();
    if (!parent) return false;
    if (parent.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(parent);
      return objectNode?.id() === identifier.id() && Boolean(propertyNode);
    }
    if (parent.kind() !== "call_expression" || callFunction(parent)?.id() !== identifier.id()) return false;
    return true;
  };

  const rewriteErrorFallback = (attribute: SourceNode): void => {
    const callback = jsxExpressionValue(attribute);
    if (!callback || (callback.kind() !== "arrow_function" && callback.kind() !== "function_expression")) return;

    const errorName = firstParameterName(callback);
    if (!errorName) {
      if (callbackHasFirstParameter(callback)) semanticReviewNames.add("ErrorBoundary fallback");
      return;
    }

    for (const member of callback.findAll({ rule: { kind: "member_expression" } })) {
      let insideNestedFunction = false;
      for (const ancestor of member.ancestors()) {
        if (ancestor.id() === callback.id()) break;
        if (isFunctionLike(ancestor)) {
          insideNestedFunction = true;
          break;
        }
      }
      if (insideNestedFunction) continue;

      const memberChildren = member.children();
      const objectNode = member.field("object") ?? memberChildren.find((child) => child.kind() === "identifier") ?? null;
      const propertyNode = member.field("property") ?? memberChildren.find((child) => child.kind() === "property_identifier") ?? null;
      const propertyName = propertyNode?.text();
      if (objectNode?.kind() !== "identifier" || objectNode.text() !== errorName) continue;
      if (!propertyName) continue;
      if (isShadowedBeforeAncestor(objectNode, errorName, callback)) continue;

      addEdit(replaceNode(member, `(${errorName}() as Error).${propertyName}`));
    }

    for (const identifier of callback.findAll({ rule: { kind: "identifier" } })) {
      if (identifier.text() !== errorName) continue;
      if (isBindingIdentifier(identifier)) continue;
      if (isShadowedBeforeAncestor(identifier, errorName, callback)) continue;
      if (isSafeErrorAccessorUse(identifier)) continue;
      addEdit(replaceNode(identifier, `(${errorName}() as Error)`));
    }
  };

  const hasSameFileValueDeclarationBefore = (identifier: SourceNode, name: string): boolean => {
    const referenceIndex = identifier.range().start.index;
    return identifier.ancestors().some((ancestor) => {
      const kind = ancestor.kind();
      return (kind === "program" || kind === "statement_block") && blockDirectDeclarationShadowsName(ancestor, name, referenceIndex);
    });
  };

  const isBindingIdentifier = (node: SourceNode): boolean => {
    const parent = node.parent();
    if (!parent) return false;
    const parentKind = parent.kind();
    return (
      (parentKind === "variable_declarator" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "function_declaration" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "function_expression" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "generator_function_declaration" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "generator_function" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "class_declaration" && parent.field("name")?.id() === node.id()) ||
      (parentKind === "arrow_function" && parent.children().find((child) => child.kind() === "identifier")?.id() === node.id()) ||
      (parentKind === "required_parameter" && (parent.field("name")?.id() === node.id() || parent.children().some((child) => child.id() === node.id()))) ||
      (parentKind === "optional_parameter" && (parent.field("name")?.id() === node.id() || parent.children().some((child) => child.id() === node.id()))) ||
      (parentKind === "catch_clause" && parent.children().some((child) => child.id() === node.id()))
    );
  };

  const isInsideJsxTag = (node: SourceNode): boolean => {
    return node.ancestors().some((ancestor) => {
      const kind = ancestor.kind();
      return kind === "jsx_opening_element" || kind === "jsx_closing_element" || kind === "jsx_self_closing_element";
    });
  };

  const isJsxModuleAugmentationSource = (node: SourceNode): boolean => {
    if (node.parent()?.kind() !== "module") return false;
    const ambientDeclaration = node.ancestors().find((ancestor) => ancestor.kind() === "ambient_declaration");
    return !!ambientDeclaration && ambientDeclaration.text().includes("namespace JSX");
  };

  const looksLikeImportedSolidContextProviderName = (name: string): boolean => /(?:Context|ContextObj)$/.test(name);

  const importStatements = rootNode.findAll({ rule: { kind: "import_statement" } });
  for (const stringNode of rootNode.findAll({ rule: { kind: "string" } })) {
    const originalModuleName = moduleNameFromString(stringNode);
    if (!originalModuleName) continue;
    const replacementModuleName =
      importSourceReplacements.get(originalModuleName) ??
      (originalModuleName === "solid-js" && isJsxModuleAugmentationSource(stringNode) ? "@solidjs/web" : undefined);
    if (!replacementModuleName || replacementModuleName === originalModuleName) continue;
    const quote = stringNode.text()[0] ?? '"';
    addEdit(replaceNode(stringNode, `${quote}${replacementModuleName}${quote}`));
  }
  for (const jsxNamespaceName of rootNode.findAll({ rule: { kind: "jsx_namespace_name" } })) {
    const prefix = jsxNamespaceName.children().find((child) => child.kind() === "identifier")?.text();
    if (prefix && removedDomDirectivePrefixes.has(prefix)) semanticReviewNames.add(`${prefix}:`);
  }
  for (const comment of rootNode.findAll({ rule: { kind: "comment" } })) {
    if (comment.text().includes("/*@once*/")) semanticReviewNames.add("/*@once*/");
  }

  const jsxElementNamespaceLocals = new Set<string>();
  const unsafeJsxNamespaceLocals = new Set<string>();
  for (const nestedType of rootNode.findAll({ rule: { kind: "nested_type_identifier" } })) {
    const children = nestedType.children();
    const namespace = children.find((child) => child.kind() === "identifier") ?? null;
    const property = children.find((child) => child.kind() === "type_identifier") ?? null;
    if (!namespace) continue;
    if (property?.text() === "Element") jsxElementNamespaceLocals.add(namespace.text());
    else unsafeJsxNamespaceLocals.add(namespace.text());
  }

  const jsxNamespaceElementRenames = new Set<string>();
  const namespaceImports = new Map<string, string>();
  const createContextLocalNames = new Set<string>();
  const createMemoLocalNames = new Set<string>();
  const createSignalLocalNames = new Set<string>();
  const ownedScopeLocalNames = new Set<string>();
  const sharedConfigLocalNames = new Set<string>();
  const onMountLocalNames = new Set<string>();
  const onCleanupLocalNames = new Set<string>();
  const importedLocalNames = new Set<string>();
  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (originalModuleName !== "solid-js" && originalModuleName !== "solid-js/store" && originalModuleName !== "solid-js/web" && originalModuleName !== "@solidjs/web" && originalModuleName !== "@solid-primitives/rootless") continue;
    const statementText = importStatement.text().trimStart();
    const typeOnlyImport = statementText.startsWith("import type");
    const namespaceImport = importStatement.find({ rule: { kind: "namespace_import" } });
    const namespaceLocal = namespaceImport?.children().find((child) => child.kind() === "identifier")?.text();
    if (namespaceLocal) {
      namespaceImports.set(namespaceLocal, originalModuleName);
      importedLocalNames.add(namespaceLocal);
    }
    const clause = importStatement.find({ rule: { kind: "import_clause" } });
    const defaultLocal = clause?.children().find((child) => child.kind() === "identifier")?.text();
    if (defaultLocal) importedLocalNames.add(defaultLocal);
    for (const specifier of importStatement.findAll({ rule: { kind: "import_specifier" } })) {
      const importedName = specifier.field("name")?.text();
      const localName = specifier.field("alias")?.text() ?? importedName;
      if (localName) importedLocalNames.add(localName);
      if (importedName && reviewOnlyNames.has(importedName)) semanticReviewNames.add(importedName);
      if (originalModuleName === "solid-js" && importedName === "Signal") semanticReviewNames.add("Signal");
      if (originalModuleName === "solid-js" && importedName === "createContext") {
        createContextLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "createSignal") {
        createSignalLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "createMemo") {
        createMemoLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (
        ((originalModuleName === "solid-js" && importedName && ["createRoot", "createEffect", "createRenderEffect", "createComputed", "createMemo", "onMount"].includes(importedName)) ||
          (originalModuleName === "@solid-primitives/rootless" && importedName === "createSingletonRoot"))
      ) {
        ownedScopeLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "sharedConfig") {
        sharedConfigLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "onMount") {
        onMountLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "onCleanup") {
        onCleanupLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (isSolidWebModule(originalModuleName) && importedName && webReviewOnlyNames.has(importedName)) semanticReviewNames.add(importedName);
      if (originalModuleName === "solid-js" && importedName === "JSX") {
        const aliasName = specifier.field("alias")?.text() ?? null;
        const jsxLocalName = aliasName ?? importedName;
        if (jsxElementNamespaceLocals.has(jsxLocalName) && !unsafeJsxNamespaceLocals.has(jsxLocalName)) {
          jsxNamespaceElementRenames.add(jsxLocalName);
        }
      }
    }
  }

  if (namespaceImports.size > 0) {
    for (const member of rootNode.findAll({ rule: { kind: "member_expression" } })) {
      const { objectNode, propertyNode } = memberExpressionParts(member);
      const propertyName = propertyNode?.text();
      const moduleName = namespaceModule(objectNode, namespaceImports);
      if (!moduleName || !propertyName) continue;
      if (reviewOnlyNames.has(propertyName)) semanticReviewNames.add(propertyName);
      if (isSolidWebModule(moduleName) && webReviewOnlyNames.has(propertyName)) semanticReviewNames.add(propertyName);
    }
  }

  const callbackContainsOnCleanup = (callback: SourceNode | null): boolean => {
    if (!callback) return false;
    for (const cleanupCall of callback.findAll({ rule: { kind: "call_expression" } })) {
      const cleanupCallee = callFunction(cleanupCall);
      if (cleanupCallee?.kind() === "identifier") {
        if (onCleanupLocalNames.has(cleanupCallee.text()) && !isLocallyShadowed(cleanupCallee, cleanupCallee.text())) return true;
        continue;
      }
      if (cleanupCallee?.kind() === "member_expression") {
        const { objectNode, propertyNode } = memberExpressionParts(cleanupCallee);
        if (propertyNode?.text() === "onCleanup" && namespaceModule(objectNode, namespaceImports) === "solid-js") return true;
      }
    }
    return false;
  };

  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    let isCreateMemoCall = false;
    let isOnMountCall = false;
    if (callee?.kind() === "identifier") {
      isCreateMemoCall = createMemoLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
      isOnMountCall = onMountLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
    } else if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      isCreateMemoCall = propertyNode?.text() === "createMemo" && namespaceModule(objectNode, namespaceImports) === "solid-js";
      isOnMountCall = propertyNode?.text() === "onMount" && namespaceModule(objectNode, namespaceImports) === "solid-js";
    }

    const args = callArguments(call);
    if (isCreateMemoCall && isAsyncFunctionNode(args[0] ?? null)) semanticReviewNames.add("async computation/loading boundary");
    if (isOnMountCall && callbackContainsOnCleanup(args[0] ?? null)) semanticReviewNames.add("onMount cleanup");
  }

  const directMigrationResult = applyDirectMigrations({ rootNode, addEdit });
  for (const handledReviewName of directMigrationResult.handledReviewNames) {
    semanticReviewNames.delete(handledReviewName);
  }

  const nonImportBindingNames = new Set<string>();
  for (const identifier of rootNode.findAll({ rule: { kind: "identifier" } })) {
    if (!isBindingIdentifier(identifier)) continue;
    if (identifier.ancestors().some((ancestor) => ancestor.kind() === "import_statement")) continue;
    nonImportBindingNames.add(identifier.text());
  }

  const isCreateSignalInitializer = (call: SourceNode): boolean => {
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") return createSignalLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
    if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      return propertyNode?.text() === "createSignal" && namespaceModule(objectNode, namespaceImports) === "solid-js";
    }
    return false;
  };

  const signalSetterNames = new Set<string>();
  const eventDispatcherNames = new Set<string>();
  if (isTestLikeFile) {
    for (const declarator of rootNode.findAll({ rule: { kind: "variable_declarator" } })) {
      const name = declarator.field("name");
      const value = declarator.field("value");
      if (name?.kind() === "array_pattern" && value?.kind() === "call_expression" && isCreateSignalInitializer(value)) {
        const bindings = name.children().filter((child) => child.kind() === "identifier");
        const setterName = bindings[1]?.text();
        if (setterName) signalSetterNames.add(setterName);
      }
      if (name?.kind() === "identifier" && value?.kind() === "call_expression") {
        const callee = callFunction(value);
        if (callee?.kind() === "identifier" && callee.text() === "createEventDispatcher" && !isLocallyShadowed(callee, "createEventDispatcher")) {
          eventDispatcherNames.add(name.text());
        }
      }
    }
  }

  const testFlushStatements = isTestLikeFile && !nonImportBindingNames.has("flush") ? collectTestStatementsNeedingFlush(signalSetterNames, eventDispatcherNames) : [];
  const needsFlushForDispatchEvents = testFlushStatements.length > 0;
  if (isTestLikeFile && testFlushStatements.length === 0 && nonImportBindingNames.has("flush") && /(?:\.dispatchEvent\s*\(|\bvi\.(?:advanceTimersByTime|advanceTimersToNextTimer|runAllTimers|runOnlyPendingTimers)\s*\()/.test(source)) {
    semanticReviewNames.add("test flush scheduling");
  }
  for (const statement of testFlushStatements) {
    const lineStart = source.lastIndexOf("\n", Math.max(0, statement.range().start.index - 1)) + 1;
    const indentation = source.slice(lineStart, statement.range().start.index).match(/^\s*/)?.[0] ?? "";
    addEdit({ startPos: statement.range().end.index, endPos: statement.range().end.index, insertedText: "\n" + indentation + "flush();" });
  }

  const typeUsageRenames = new Map<string, string>();
  const emittedNamedImportBindings = new Set<string>();
  let sawSolidJsImport = false;
  const reviewStubDeclarations: string[] = [];
  const emittedReviewStubs = new Set<string>();
  const addReviewStub = (localName: string, importedName: string, typeOnlySpecifier: boolean): void => {
    const key = (typeOnlySpecifier ? "type" : "value") + ":" + localName;
    if (emittedReviewStubs.has(key)) return;
    emittedReviewStubs.add(key);
    reviewStubDeclarations.push(reviewStubDeclaration(localName, importedName, typeOnlySpecifier));
  };
  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (!originalModuleName) continue;

    const replacementModuleName = importSourceReplacements.get(originalModuleName) ?? originalModuleName;
    const quote = sourceNode.text()[0] ?? '"';
    const statementText = importStatement.text().trimStart();
    const typeOnlyImport = statementText.startsWith("import type");
    if (originalModuleName === "solid-js" && !typeOnlyImport) sawSolidJsImport = true;
    const namedImports = importStatement.find({ rule: { kind: "named_imports" } });
    if (!namedImports) {
      if (replacementModuleName !== originalModuleName) addEdit(replaceNode(sourceNode, `${quote}${replacementModuleName}${quote}`));
      continue;
    }

    const clause: SourceNode | null = importStatement.find({ rule: { kind: "import_clause" } });
    const otherImportParts: string[] = [];
    if (clause) {
      const clauseChildren: SourceNode[] = clause.children();
      for (const child of clauseChildren) {
        if (child.kind() === "identifier" || child.kind() === "namespace_import") otherImportParts.push(child.text());
      }
    }

    const primarySpecifiers: string[] = [];
    const solidTypeSpecifiers: string[] = [];
    const rendererTypeSpecifiers: string[] = [];
    let changedNamedImport = false;
    const importSpecifiers = namedImports.children().filter((child) => child.kind() === "import_specifier");

    const addPrimarySpecifier = (text: string, importedName: string, aliasName: string | null, typeOnlySpecifier: boolean): void => {
      const key = namedImportBindingKey(replacementModuleName, importedName, aliasName, typeOnlySpecifier);
      if (emittedNamedImportBindings.has(key)) {
        changedNamedImport = true;
        return;
      }
      emittedNamedImportBindings.add(key);
      primarySpecifiers.push(text);
    };

    const addRendererTypeSpecifier = (text: string, importedName: string, aliasName: string | null): void => {
      const key = namedImportBindingKey("@solidjs/web", importedName, aliasName, true);
      if (emittedNamedImportBindings.has(key)) {
        changedNamedImport = true;
        return;
      }
      emittedNamedImportBindings.add(key);
      rendererTypeSpecifiers.push(text);
    };

    const addSolidTypeSpecifier = (text: string, importedName: string, aliasName: string | null): void => {
      const key = namedImportBindingKey("solid-js", importedName, aliasName, true);
      if (emittedNamedImportBindings.has(key)) {
        changedNamedImport = true;
        return;
      }
      emittedNamedImportBindings.add(key);
      solidTypeSpecifiers.push(text);
    };

    for (const specifier of importSpecifiers) {
      const importedNode = specifier.field("name");
      if (!importedNode) continue;
      const importedName = importedNode.text();
      const aliasNode = specifier.field("alias");
      const aliasName = aliasNode?.text() ?? null;
      const localName = aliasName ?? importedName;
      const isTypeOnlySpecifier = specifierIsTypeOnly(specifier, typeOnlyImport);
      const solidTypeReplacement = originalModuleName === "solid-js" ? solidTypeRenames.get(importedName) : null;
      const rewriteJsxElementNamespace = originalModuleName === "solid-js" && importedName === "JSX" && jsxNamespaceElementRenames.has(localName);
      const isRendererType = originalModuleName === "solid-js" && rendererTypeNames.has(importedName) && !rewriteJsxElementNamespace;
      const webReplacementName = isSolidWebModule(originalModuleName) ? webSafeImportRenames.get(importedName) : null;

      if (originalModuleName === "solid-js" && importedName === "Signal") {
        addReviewStub(localName, importedName, true);
        changedNamedImport = true;
        continue;
      }

      if (rewriteJsxElementNamespace) {
        addSolidTypeSpecifier(specifierText(specifier, "Element", null, true), "Element", null);
        changedNamedImport = true;
        continue;
      }

      if (solidTypeReplacement) {
        addSolidTypeSpecifier(specifierText(specifier, solidTypeReplacement, aliasName, true), solidTypeReplacement, aliasName);
        changedNamedImport = true;
        if (!aliasName) typeUsageRenames.set(importedName, solidTypeReplacement);
        continue;
      }

      if (webReplacementName) {
        addPrimarySpecifier(specifierText(specifier, webReplacementName, aliasName, typeOnlyImport), webReplacementName, aliasName, isTypeOnlySpecifier);
        changedNamedImport = true;
        if (!aliasName) usageRenames.set(importedName, webReplacementName);
        continue;
      }

      if (isSolidWebModule(originalModuleName) && webReviewOnlyNames.has(importedName)) {
        addReviewStub(localName, importedName, isTypeOnlySpecifier);
        changedNamedImport = true;
        continue;
      }

      if (
        (originalModuleName === "solid-js" || originalModuleName === "solid-js/store") &&
        reviewOnlyNames.has(importedName) &&
        removedCoreStubNames.has(importedName) &&
        !directMigrationResult.handledReviewNames.has(importedName)
      ) {
        addReviewStub(localName, importedName, isTypeOnlySpecifier);
        changedNamedImport = true;
        continue;
      }

      if (isRendererType) {
        addRendererTypeSpecifier(specifierText(specifier, importedName, aliasName, true), importedName, aliasName);
        changedNamedImport = true;
        continue;
      }

      if (originalModuleName === "solid-js" && importedName === "Errored") {
        jsxComponentRenames.push({
          localName,
          replacementName: localName,
          addKeyedFalse: false,
          rewriteRevealProps: false,
          rewriteErrorFallback: true,
        });
      }

      const replacementName = safeImportRenames.get(importedName);
      if (replacementName && (originalModuleName === "solid-js" || originalModuleName === "solid-js/store")) {
        const replacementAliasName = aliasName ?? (nonImportBindingNames.has(replacementName) ? localName : null);
        const replacementLocalName = replacementAliasName ?? replacementName;
        addPrimarySpecifier(specifierText(specifier, replacementName, replacementAliasName, typeOnlyImport), replacementName, replacementAliasName, isTypeOnlySpecifier);
        changedNamedImport = true;
        if (!aliasName && !replacementAliasName) usageRenames.set(importedName, replacementName);
        if (importedName === "Suspense" || importedName === "SuspenseList" || importedName === "ErrorBoundary" || importedName === "Index") {
          jsxComponentRenames.push({
            localName,
            replacementName: replacementLocalName,
            addKeyedFalse: importedName === "Index",
            rewriteRevealProps: importedName === "SuspenseList",
            rewriteErrorFallback: importedName === "ErrorBoundary",
          });
        }
        continue;
      }

      addPrimarySpecifier(specifierText(specifier, importedName, aliasName, typeOnlyImport), importedName, aliasName, isTypeOnlySpecifier);
    }

    if (needsFlushForDispatchEvents && originalModuleName === "solid-js" && !typeOnlyImport) {
      addPrimarySpecifier("flush", "flush", null, false);
      changedNamedImport = true;
    }

    if (!changedNamedImport && replacementModuleName === originalModuleName) continue;

    const importLines: string[] = [];
    const primaryParts = [...otherImportParts];
    const uniquePrimarySpecifiers = uniqueStrings(primarySpecifiers);
    const uniqueRendererTypeSpecifiers = uniqueStrings(rendererTypeSpecifiers);
    if (uniquePrimarySpecifiers.length > 0) primaryParts.push(`{ ${uniquePrimarySpecifiers.join(", ")} }`);
    if (primaryParts.length > 0) {
      const importPrefix = typeOnlyImport ? "import type" : "import";
      importLines.push(`${importPrefix} ${primaryParts.join(", ")} from ${quote}${replacementModuleName}${quote};`);
    }
    const uniqueSolidTypeSpecifiers = uniqueStrings(solidTypeSpecifiers);
    if (uniqueSolidTypeSpecifiers.length > 0) {
      importLines.push(`import type { ${uniqueSolidTypeSpecifiers.join(", ")} } from ${quote}solid-js${quote};`);
    }
    if (uniqueRendererTypeSpecifiers.length > 0) {
      importLines.push(`import type { ${uniqueRendererTypeSpecifiers.join(", ")} } from ${quote}@solidjs/web${quote};`);
    }

    const replacement = importLines.join("\n");
    addEdit(replaceNode(importStatement, replacement));
  }

  if (needsFlushForDispatchEvents && !sawSolidJsImport) {
    const firstImport = importStatements[0];
    const insertion = "import { flush } from \"solid-js\";\n";
    if (firstImport) addEdit({ startPos: firstImport.range().start.index, endPos: firstImport.range().start.index, insertedText: insertion });
    else addEdit({ startPos: 0, endPos: 0, insertedText: insertion });
  }

  if (reviewStubDeclarations.length > 0) {
    const lastImport = importStatements[importStatements.length - 1];
    const stubBlock = "\n// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.\n" + reviewStubDeclarations.join("\n") + "\n";
    if (lastImport) addEdit({ startPos: lastImport.range().end.index, endPos: lastImport.range().end.index, insertedText: stubBlock });
    else addEdit({ startPos: 0, endPos: 0, insertedText: stubBlock + "\n" });
  }

  if (usageRenames.size > 0) {
    const identifiers = rootNode.findAll({ rule: { kind: "identifier" } });
    for (const identifier of identifiers) {
      const replacement = usageRenames.get(identifier.text());
      if (!replacement) continue;
      if (identifier.ancestors().some((ancestor) => ancestor.kind() === "import_statement")) continue;
      if (isInsideJsxTag(identifier)) continue;
      if (isBindingIdentifier(identifier)) continue;
      if (isLocallyShadowed(identifier, identifier.text())) continue;
      addEdit(replaceNode(identifier, replacement));
    }
  }

  if (namespaceImports.size > 0) {
    for (const member of rootNode.findAll({ rule: { kind: "member_expression" } })) {
      const { objectNode, propertyNode } = memberExpressionParts(member);
      const propertyName = propertyNode?.text();
      const moduleName = namespaceModule(objectNode, namespaceImports);
      if (!moduleName || !propertyName || !propertyNode) continue;

      const replacement = isSolidCoreModule(moduleName)
        ? safeImportRenames.get(propertyName)
        : isSolidWebModule(moduleName)
          ? webSafeImportRenames.get(propertyName)
          : null;
      if (replacement) {
        addEdit(replaceNode(propertyNode, replacement));
        continue;
      }

      const isReviewOnlyNamespaceMember = isSolidCoreModule(moduleName)
        ? reviewOnlyNames.has(propertyName) && removedNamespaceStubNames.has(propertyName) && !directMigrationResult.handledReviewNames.has(propertyName)
        : isSolidWebModule(moduleName)
          ? webReviewOnlyNames.has(propertyName)
          : false;
      if (isReviewOnlyNamespaceMember && objectNode) addEdit(replaceNode(objectNode, "(" + objectNode.text() + " as any)"));
    }
  }

  if (typeUsageRenames.size > 0) {
    for (const typeIdentifier of rootNode.findAll({ rule: { kind: "type_identifier" } })) {
      const replacement = typeUsageRenames.get(typeIdentifier.text());
      if (!replacement) continue;
      if (typeIdentifier.ancestors().some((ancestor) => ancestor.kind() === "import_statement")) continue;
      if (typeIdentifier.parent()?.kind() === "nested_type_identifier") continue;
      addEdit(replaceNode(typeIdentifier, replacement));
    }
  }

  if (jsxNamespaceElementRenames.size > 0) {
    for (const nestedType of rootNode.findAll({ rule: { kind: "nested_type_identifier" } })) {
      const children = nestedType.children();
      const namespace = children.find((child) => child.kind() === "identifier") ?? null;
      const property = children.find((child) => child.kind() === "type_identifier") ?? null;
      if (!namespace || property?.text() !== "Element") continue;
      if (!jsxNamespaceElementRenames.has(namespace.text())) continue;
      addEdit(replaceNode(nestedType, "Element"));
    }
  }

  if (sharedConfigLocalNames.size > 0) {
    for (const member of rootNode.findAll({ rule: { kind: "member_expression" } })) {
      const { objectNode, propertyNode } = memberExpressionParts(member);
      if (!objectNode || objectNode.kind() !== "identifier" || propertyNode?.text() !== "context") continue;
      if (!sharedConfigLocalNames.has(objectNode.text()) || isLocallyShadowed(objectNode, objectNode.text())) continue;
      addEdit(replaceNode(objectNode, `(${objectNode.text()} as any)`));
      semanticReviewNames.add("sharedConfig.context");
    }
  }

  const isCreateSignalCall = (call: SourceNode): boolean => {
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") {
      return createSignalLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
    }
    if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      return propertyNode?.text() === "createSignal" && namespaceModule(objectNode, namespaceImports) === "solid-js";
    }
    return false;
  };

  const isKnownOwnedScopeCallback = (node: SourceNode): boolean => {
    if (!isFunctionLike(node)) return false;
    const args = node.parent();
    const call = args?.parent();
    if (!args || args.kind() !== "arguments" || !call || call.kind() !== "call_expression") return false;
    if (!args.children().filter((child) => child.isNamed()).some((child) => child.id() === node.id())) return false;
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") {
      return ownedScopeLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
    }
    if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      return Boolean(propertyNode?.text() && ["createRoot", "createEffect", "createRenderEffect", "createComputed", "createMemo", "onMount"].includes(propertyNode.text()) && namespaceModule(objectNode, namespaceImports) === "solid-js");
    }
    return false;
  };

  const hasSetterCallInScope = (scope: SourceNode, setterName: string, afterIndex: number): boolean => {
    for (const setterCall of scope.findAll({ rule: { kind: "call_expression" } })) {
      if (setterCall.range().start.index <= afterIndex) continue;
      const setterCallee = callFunction(setterCall);
      if (!setterCallee || setterCallee.kind() !== "identifier" || setterCallee.text() !== setterName) continue;
      if (isBindingIdentifier(setterCallee)) continue;
      const shadowingFunction = setterCallee.ancestors().find((ancestor) => ancestor.id() !== scope.id() && isFunctionLike(ancestor) && functionParametersShadowName(ancestor, setterName));
      if (shadowingFunction) continue;
      return true;
    }
    return false;
  };

  const isExternalCallbackHost = (call: SourceNode): boolean => {
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") return ["setTimeout", "setInterval", "requestAnimationFrame", "queueMicrotask"].includes(callee.text());
    if (callee?.kind() !== "member_expression") return false;
    const { propertyNode } = memberExpressionParts(callee);
    return propertyNode?.text() === "addEventListener";
  };

  const hasSetterCallInExternalCallback = (setterName: string, afterIndex: number): boolean => {
    for (const setterCall of rootNode.findAll({ rule: { kind: "call_expression" } })) {
      if (setterCall.range().start.index <= afterIndex) continue;
      const setterCallee = callFunction(setterCall);
      if (!setterCallee || setterCallee.kind() !== "identifier" || setterCallee.text() !== setterName) continue;
      if (isBindingIdentifier(setterCallee)) continue;
      for (const callback of setterCall.ancestors().filter((ancestor) => isFunctionLike(ancestor))) {
        const args = callback.parent();
        const hostCall = args?.parent();
        if (args?.kind() === "arguments" && hostCall?.kind() === "call_expression" && isExternalCallbackHost(hostCall)) return true;
      }
    }
    return false;
  };

  const insertOwnedWriteOption = (call: SourceNode): boolean => {
    const argsNode = call.field("arguments") ?? call.children().find((child) => child.kind() === "arguments") ?? null;
    if (!argsNode) return false;
    const args = callArguments(call);
    if (args.some((arg) => /\bownedWrite\b/.test(arg.text()))) return true;
    if (args.length < 2) {
      let insertedText = "undefined, { ownedWrite: true }";
      if (args.length === 1) {
        const firstArg = args[0];
        if (!firstArg) return false;
        const trailingText = source.slice(firstArg.range().end.index, argsNode.range().end.index - 1);
        insertedText = /,\s*$/.test(trailingText) ? " { ownedWrite: true }" : ", { ownedWrite: true }";
      }
      addEdit({ startPos: argsNode.range().end.index - 1, endPos: argsNode.range().end.index - 1, insertedText });
      return true;
    }
    const options = args[1];
    if (options?.kind() !== "object") return false;
    const optionText = options.text();
    let insertPos = options.range().end.index - 1;
    while (insertPos > options.range().start.index && /\s/.test(source[insertPos - 1] ?? "")) insertPos -= 1;
    const insertion = optionText.trim() === "{}" ? " ownedWrite: true " : (optionText.trim().endsWith(",") ? " ownedWrite: true" : ", ownedWrite: true");
    addEdit({ startPos: insertPos, endPos: insertPos, insertedText: insertion });
    return true;
  };

  for (const declarator of rootNode.findAll({ rule: { kind: "variable_declarator" } })) {
    const name = declarator.field("name");
    const value = declarator.field("value");
    if (!name || name.kind() !== "array_pattern" || !value || value.kind() !== "call_expression" || !isCreateSignalCall(value)) continue;
    const bindings = name.children().filter((child) => child.kind() === "identifier");
    const setterName = bindings[1]?.text();
    if (!setterName) continue;
    const ownedScope = declarator.ancestors().find((ancestor) => isKnownOwnedScopeCallback(ancestor));
    const needsOwnedWrite = ownedScope
      ? hasSetterCallInScope(ownedScope, setterName, declarator.range().end.index)
      : hasSetterCallInExternalCallback(setterName, declarator.range().end.index);
    if (!needsOwnedWrite) continue;
    if (!insertOwnedWriteOption(value)) semanticReviewNames.add("ownedWrite signal options");
  }

  const createContextDeclarators = rootNode.findAll({
    rule: {
      kind: "variable_declarator",
    },
  });
  for (const declarator of createContextDeclarators) {
    const value = declarator.field("value");
    if (!value || value.kind() !== "call_expression") continue;
    const callee = callFunction(value);
    let isCreateContextCall = false;
    if (callee?.kind() === "identifier") {
      isCreateContextCall = createContextLocalNames.has(callee.text()) && !isLocallyShadowed(callee, callee.text());
    } else if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      isCreateContextCall = propertyNode?.text() === "createContext" && namespaceModule(objectNode, namespaceImports) === "solid-js";
    }
    if (!isCreateContextCall) continue;

    const createContextArgs = callArguments(value);
    if (createContextArgs.length === 0) {
      addEdit({ startPos: value.range().end.index - 1, endPos: value.range().end.index - 1, insertedText: "null as any" });
      semanticReviewNames.add("createContext default value");
    }

    const name = declarator.field("name");
    if (name?.kind() === "identifier") {
      contextNames.add(name.text());
      contextDeclaratorIds.add(declarator.id());
    }
  }

  const insertJsxReviewComment = (tag: SourceNode, message: string): void => {
    const statement = tag.ancestors().find((ancestor) => ancestor.kind() === "return_statement" || ancestor.kind() === "expression_statement" || ancestor.kind() === "lexical_declaration") ?? tag;
    if (statement.kind() === "return_statement") {
      addEdit({ startPos: statement.range().start.index, endPos: statement.range().start.index, insertedText: `// TODO(solid-2): ${message}\n  ` });
      return;
    }
    addEdit({ startPos: tag.range().start.index, endPos: tag.range().start.index, insertedText: `{/* TODO(solid-2): ${message} */}\n  ` });
  };

  const jsxTags = rootNode.findAll({
    rule: {
      any: [
        { kind: "jsx_opening_element" },
        { kind: "jsx_closing_element" },
        { kind: "jsx_self_closing_element" },
      ],
    },
  });
  for (const tag of jsxTags) {
    const name = tag.field("name");
    if (!name) continue;

    if (name.kind() === "member_expression" && name.text().endsWith(".Provider")) {
      const { objectNode, propertyNode } = memberExpressionParts(name);
      const contextName = objectNode?.text() ?? name.text().slice(0, -".Provider".length);
      const isUnshadowedProvider =
        propertyNode?.text() === "Provider" &&
        objectNode?.kind() === "identifier" &&
        !isContextNameShadowed(objectNode, contextName);
      const isImportedOrExternalProvider =
        isUnshadowedProvider &&
        objectNode?.kind() === "identifier" &&
        (importedLocalNames.has(contextName) || !hasSameFileValueDeclarationBefore(objectNode, contextName));
      const shouldRewriteImportedProvider =
        isImportedOrExternalProvider &&
        looksLikeImportedSolidContextProviderName(contextName);
      if (isUnshadowedProvider && (contextNames.has(contextName) || shouldRewriteImportedProvider)) {
        addEdit(replaceNode(name, contextName));
        if (shouldRewriteImportedProvider) semanticReviewNames.add(`${contextName}.Provider`);
      } else if (isImportedOrExternalProvider && tag.kind() !== "jsx_closing_element") {
        semanticReviewNames.add(`${contextName}.Provider`);
        insertJsxReviewComment(tag, `Review ${contextName}.Provider; only same-file Solid createContext providers are rewritten.`);
      }
      continue;
    }

    if (name.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(name);
      const moduleName = namespaceModule(objectNode, namespaceImports);
      const propertyName = propertyNode?.text();
      const replacementName = propertyName && isSolidCoreModule(moduleName) ? safeImportRenames.get(propertyName) : null;
      if (!propertyNode || !propertyName || !replacementName) continue;

      if (propertyName === "ErrorBoundary" && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
        const fallback = jsxAttribute(tag, "fallback");
        if (fallback) rewriteErrorFallback(fallback);
      }

      addEdit(replaceNode(propertyNode, replacementName));

      if (propertyName === "Index" && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
        const keyed = jsxAttribute(tag, "keyed");
        if (keyed) {
          semanticReviewNames.add("Index keyed");
          insertJsxReviewComment(tag, "Review Index keyed conflict; Index always maps to For keyed={false}.");
          addEdit(replaceNode(keyed, "keyed={false}"));
        }
        else addEdit(insertBeforeJsxTagClose(tag, " keyed={false}"));
      }

      if (propertyName === "SuspenseList" && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
        const revealOrder = jsxAttribute(tag, "revealOrder");
        if (revealOrder) {
          const value = jsxAttributeValue(revealOrder, "revealOrder");
          if (value === '"forwards"' || value === "'forwards'") addEdit(replaceNode(revealOrder, ""));
          else if (value === '"together"' || value === "'together'") addEdit(replaceNode(revealOrder, 'order="together"'));
          else {
            semanticReviewNames.add("SuspenseList props");
            insertJsxReviewComment(tag, value.startsWith('"') || value.startsWith("'") ? "Review unsupported SuspenseList revealOrder/tail values." : "Review dynamic SuspenseList revealOrder.");
          }
        }
        const tail = jsxAttribute(tag, "tail");
        if (tail) {
          const value = jsxAttributeValue(tail, "tail");
          if (value === '"collapsed"' || value === "'collapsed'") addEdit(replaceNode(tail, "collapsed"));
          else {
            semanticReviewNames.add("SuspenseList props");
            insertJsxReviewComment(tag, "Review unsupported SuspenseList revealOrder/tail values.");
          }
        }
      }
      continue;
    }

    if (name.kind() !== "identifier") continue;
    const localName = name.text();
    const componentRename = jsxComponentRenames.find((rename) => rename.localName === localName);
    const shouldRewriteErrorFallback = componentRename?.rewriteErrorFallback ?? false;

    if (componentRename && isLocallyShadowed(name, localName)) continue;

    if (shouldRewriteErrorFallback && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
      const fallback = jsxAttribute(tag, "fallback");
      if (fallback) rewriteErrorFallback(fallback);
    }

    if (!componentRename) continue;

    if (componentRename.addKeyedFalse && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
      if (componentRename.replacementName !== localName) addEdit(replaceNode(name, componentRename.replacementName));
      const keyed = jsxAttribute(tag, "keyed");
      if (keyed) {
        semanticReviewNames.add("Index keyed");
        insertJsxReviewComment(tag, "Review Index keyed conflict; Index always maps to For keyed={false}.");
        addEdit(replaceNode(keyed, "keyed={false}"));
      }
      else addEdit(insertBeforeJsxTagClose(tag, " keyed={false}"));
      continue;
    }

    if (componentRename.rewriteRevealProps && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
      if (componentRename.replacementName !== localName) addEdit(replaceNode(name, componentRename.replacementName));
      const revealOrder = jsxAttribute(tag, "revealOrder");
      if (revealOrder) {
        const value = jsxAttributeValue(revealOrder, "revealOrder");
        if (value === '"forwards"' || value === "'forwards'") addEdit(replaceNode(revealOrder, ""));
        else if (value === '"together"' || value === "'together'") addEdit(replaceNode(revealOrder, 'order="together"'));
        else {
          semanticReviewNames.add("SuspenseList props");
          insertJsxReviewComment(tag, value.startsWith('"') || value.startsWith("'") ? "Review unsupported SuspenseList revealOrder/tail values." : "Review dynamic SuspenseList revealOrder.");
        }
      }
      const tail = jsxAttribute(tag, "tail");
      if (tail) {
        const value = jsxAttributeValue(tail, "tail");
        if (value === '"collapsed"' || value === "'collapsed'") addEdit(replaceNode(tail, "collapsed"));
        else {
          semanticReviewNames.add("SuspenseList props");
          insertJsxReviewComment(tag, "Review unsupported SuspenseList revealOrder/tail values.");
        }
      }
      continue;
    }

    if (componentRename.replacementName !== localName) addEdit(replaceNode(name, componentRename.replacementName));
  }

  for (const member of rootNode.findAll({ rule: { kind: "member_expression" } })) {
    if (member.parent()?.kind().startsWith("jsx_")) continue;
    const { objectNode, propertyNode } = memberExpressionParts(member);
    const contextName = objectNode?.kind() === "identifier" ? objectNode.text() : null;
    if (!contextName || propertyNode?.text() !== "Provider") continue;
    if (!contextNames.has(contextName) || isContextNameShadowed(objectNode as SourceNode, contextName)) continue;
    addEdit(replaceNode(member, contextName));
  }

  const jsxOpenTags = rootNode.findAll({
    rule: {
      any: [{ kind: "jsx_opening_element" }, { kind: "jsx_self_closing_element" }],
    },
  });
  const classExpressionNeedsHelper = (value: string): boolean => {
    const trimmed = value.trim();
    return (trimmed.startsWith("{") || trimmed.startsWith("[")) && !trimmed.startsWith(`${classNameHelperName}(`);
  };
  const normalizeClassNameInput = (value: string): string => {
    return value
      .replace(/\.\.\.([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.classList\b/g, "...($1 as any).classList")
      .replace(/\[([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*!?)\]/g, (_match, keyExpression: string) => {
        const key = keyExpression.endsWith("!") ? keyExpression.slice(0, -1) : keyExpression;
        return `[${key} as string]`;
      });
  };
  const classNameCall = (value: string): string => {
    needsClassNameHelper = true;
    return `${classNameHelperName}(${normalizeClassNameInput(value)})`;
  };
  for (const tag of jsxOpenTags) {
    const classListAttribute = jsxAttribute(tag, "classList");
    const classAttribute = jsxAttribute(tag, "class");

    if (classListAttribute) {
      if (!classAttribute) {
        addEdit(replaceNode(classListAttribute, `class={${classNameCall(jsxAttributeValue(classListAttribute, "classList"))}}`));
        continue;
      }

      const nextClassAttribute = `class={${classNameCall(`[${jsxAttributeValue(classAttribute, "class")}, ${jsxAttributeValue(classListAttribute, "classList")}]`)}}`;
      addEdit(replaceNode(classAttribute, nextClassAttribute));
      addEdit(removeJsxAttribute(classListAttribute));
      continue;
    }

    if (classAttribute) {
      const classValue = jsxAttributeValue(classAttribute, "class");
      if (classExpressionNeedsHelper(classValue)) {
        addEdit(replaceNode(classAttribute, `class={${classNameCall(classValue)}}`));
      }
    }
  }

  if (needsClassNameHelper) {
    const helper = `function ${classNameHelperName}(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(${classNameHelperName}).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => !!enabled)
      .map(([name]) => name)
      .join(" ");
  }
  return "";
}
`;
    if (importStatements.length > 0) {
      const lastImport = importStatements[importStatements.length - 1]!;
      const lastImportRange = lastImport.range();
      const lastImportReplacement = edits.find((edit) => edit.startPos === lastImportRange.start.index && edit.endPos === lastImportRange.end.index);
      if (lastImportReplacement) lastImportReplacement.insertedText = `${lastImportReplacement.insertedText}

${helper}`;
      else addEdit({ startPos: lastImportRange.end.index, endPos: lastImportRange.end.index, insertedText: `

${helper}` });
    } else {
      const existingStartInsertion = edits.find((edit) => edit.startPos === 0 && edit.endPos === 0);
      if (existingStartInsertion) existingStartInsertion.insertedText = `${helper}
${existingStartInsertion.insertedText}`;
      else addEdit({ startPos: 0, endPos: 0, insertedText: `${helper}
` });
    }
  }

  if (!insertedSemanticReviewMarker && semanticReviewNames.size > 0) {
    const firstImport = importStatements[0];
    const marker = `// TODO(solid-2): Review semantic migration sites in this file: ${Array.from(semanticReviewNames).sort().join(", ")}.`;
    if (firstImport) {
      const firstImportRange = firstImport.range();
      const firstImportReplacement = edits.find((edit) => edit.startPos === firstImportRange.start.index && edit.endPos === firstImportRange.end.index);
      if (firstImportReplacement) firstImportReplacement.insertedText = `${marker}\n${firstImportReplacement.insertedText}`;
      else addEdit({ startPos: firstImportRange.start.index, endPos: firstImportRange.start.index, insertedText: `${marker}\n` });
    } else {
      addEdit({ startPos: 0, endPos: 0, insertedText: `${marker}\n` });
    }
    insertedSemanticReviewMarker = true;
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
