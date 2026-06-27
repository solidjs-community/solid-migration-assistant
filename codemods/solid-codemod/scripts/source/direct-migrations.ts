import type { Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { importSourceReplacements, rendererTypeNames, safeImportRenames, webSafeImportRenames } from "./solid-api.ts";

type SourceNode = SgNode<TSX>;

interface ApplyDirectMigrationsOptions {
  rootNode: SourceNode;
  addEdit: (edit: Edit) => void;
}

export interface DirectMigrationResult {
  handledReviewNames: Set<string>;
}

interface ImportSpecifierInfo {
  importedName: string;
  localName: string;
  aliasName: string | null;
  specifier: SourceNode;
}

interface ImportStatementInfo {
  statement: SourceNode;
  moduleName: string;
  quote: string;
  typeOnlyImport: boolean;
  otherImportParts: string[];
  specifiers: ImportSpecifierInfo[];
}

interface ImportedBinding extends ImportSpecifierInfo {
  moduleName: string;
  statement: SourceNode;
}

const solidModules = new Set(["solid-js", "solid-js/store"]);
const webModules = new Set(["solid-js/web", "@solidjs/web"]);
const solidCompatStubImportNames = new Set([
  "catchError",
  "cancelCallback",
  "createComputed",
  "createDeferred",
  "createEffect",
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
  "ReconcileOptions",
  "splitProps",
  "startTransition",
  "useTransition",
  "writeSignal",
]);
const directReviewNames = [
  "createComputed",
  "createDynamic",
  "createMemo",
  "createSelector",
  "indexArray",
  "on",
  "produce",
  "splitProps",
  "onMount cleanup",
];

export function applyDirectMigrations({ rootNode, addEdit }: ApplyDirectMigrationsOptions): DirectMigrationResult {
  const imports = collectImports(rootNode);
  const importedByLocal = new Map<string, ImportedBinding>();
  const namespaceImports = new Map<string, string>();
  const namespaceImportInfos = new Map<string, ImportStatementInfo>();
  for (const importInfo of imports) {
    for (const specifier of importInfo.specifiers) {
      importedByLocal.set(specifier.localName, { ...specifier, moduleName: importInfo.moduleName, statement: importInfo.statement });
    }

    const namespaceImport = importInfo.statement.find({ rule: { kind: "namespace_import" } });
    const namespaceLocal = namespaceImport?.children().find((child) => child.kind() === "identifier")?.text();
    if (namespaceLocal) {
      namespaceImports.set(namespaceLocal, importInfo.moduleName);
      namespaceImportInfos.set(namespaceLocal, importInfo);
    }
  }

  const state = {
    importRemovals: new Map<number, Set<string>>(),
    importRenames: new Map<number, Map<string, string>>(),
    solidExtrasByStatement: new Map<number, Set<string>>(),
    webExtrasByStatement: new Map<number, Set<string>>(),
    forceSolidModuleStatements: new Set<number>(),
    handled: new Set<string>(),
    unhandled: new Set<string>(),
    cleanupHandled: false,
  };

  const replaceNode = (node: SourceNode, insertedText: string): Edit => ({
    startPos: node.range().start.index,
    endPos: node.range().end.index,
    insertedText,
  });

  const imported = (localName: string, importedName: string, modules: Set<string>): ImportedBinding | null => {
    const binding = importedByLocal.get(localName);
    if (!binding || binding.importedName !== importedName || !modules.has(binding.moduleName)) return null;
    if (isLocallyShadowed(binding.specifier, localName)) return null;
    return binding;
  };

  const markImportRemoval = (binding: ImportedBinding): void => {
    const id = binding.statement.id();
    const removals = state.importRemovals.get(id) ?? new Set<string>();
    removals.add(binding.localName);
    state.importRemovals.set(id, removals);
  };

  const markImportRename = (binding: ImportedBinding, importedName: string): void => {
    const id = binding.statement.id();
    const renames = state.importRenames.get(id) ?? new Map<string, string>();
    renames.set(binding.localName, importedName);
    state.importRenames.set(id, renames);
  };

  const addSolidExtra = (statement: SourceNode, importedName: string): void => {
    const id = statement.id();
    const extras = state.solidExtrasByStatement.get(id) ?? new Set<string>();
    extras.add(importedName);
    state.solidExtrasByStatement.set(id, extras);
  };

  const addWebExtra = (statement: SourceNode, importedName: string): void => {
    const id = statement.id();
    const extras = state.webExtrasByStatement.get(id) ?? new Set<string>();
    extras.add(importedName);
    state.webExtrasByStatement.set(id, extras);
  };

  const calls = rootNode.findAll({ rule: { kind: "call_expression" } });
  for (const call of calls) {
    const callee = callFunction(call);
    const args = callArguments(call);
    if (!callee) continue;

    if (callee.kind() === "identifier") {
      const localName = callee.text();
      if (isLocallyShadowed(callee, localName)) continue;

      const createDynamicBinding = imported(localName, "createDynamic", new Set([...solidModules, ...webModules]));
      if (createDynamicBinding) {
        if (args.length === 2 && args[0] && args[1]) {
          addEdit(replaceNode(call, `createComponent(dynamic(${args[0].text()}), ${args[1].text()})`));
          markImportRemoval(createDynamicBinding);
          addSolidExtra(createDynamicBinding.statement, "createComponent");
          addWebExtra(createDynamicBinding.statement, "dynamic");
          state.handled.add("createDynamic");
        } else {
          state.unhandled.add("createDynamic");
        }
        continue;
      }

      const createEffectBinding = imported(localName, "createEffect", solidModules);
      if (createEffectBinding) {
        state.unhandled.add("createEffect");
        continue;
      }

      const createMemoBinding = imported(localName, "createMemo", solidModules);
      if (createMemoBinding) {
        const createMemoResult = rewriteCreateMemoCall(call, args, addEdit, replaceNode);
        if (createMemoResult) {
          state.handled.add("createMemo");
          if (createMemoResult.handledOn) {
            state.handled.add("on");
            const onCallee = args[0]?.kind() === "call_expression" ? callFunction(args[0]!) : null;
            if (onCallee?.kind() === "identifier") {
              const onBinding = imported(onCallee.text(), "on", solidModules);
              if (onBinding) markImportRemoval(onBinding);
            }
          }
        } else {
          state.unhandled.add("createMemo");
        }
        continue;
      }

      const indexArrayBinding = imported(localName, "indexArray", solidModules);
      if (indexArrayBinding) {
        if (args.length === 2 && args[0] && args[1]) {
          addEdit(replaceNode(call, `mapArray(${args[0].text()}, ${args[1].text()}, { keyed: false })`));
          markImportRename(indexArrayBinding, "mapArray");
          state.handled.add("indexArray");
        } else {
          state.unhandled.add("indexArray");
        }
        continue;
      }

      const createComputedBinding = imported(localName, "createComputed", solidModules);
      if (createComputedBinding) {
        if (
          rewriteCapturedAccessorCreateComputed(call, args, rootNode, addEdit, replaceNode) ||
          rewriteDerivedCreateComputed(call, args, rootNode, addEdit, replaceNode)
        ) {
          markImportRemoval(createComputedBinding);
          state.handled.add("createComputed");
        } else {
          state.unhandled.add("createComputed");
        }
        continue;
      }

      const createSelectorBinding = imported(localName, "createSelector", solidModules);
      if (createSelectorBinding) {
        state.unhandled.add("createSelector");
        continue;
      }

      const splitPropsBinding = imported(localName, "splitProps", solidModules);
      if (splitPropsBinding) {
        if (rewriteRestOnlySplitProps(call, args, addEdit, replaceNode)) {
          markImportRename(splitPropsBinding, "omit");
          state.handled.add("splitProps");
        } else {
          state.unhandled.add("splitProps");
        }
        continue;
      }
    } else if (callee.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      const namespaceName = objectNode?.kind() === "identifier" ? objectNode.text() : null;
      const namespaceModuleName = namespaceName ? namespaceImports.get(namespaceName) : null;
      if (namespaceName && propertyNode?.text() === "createDynamic" && webModules.has(namespaceModuleName ?? "") && !isLocallyShadowed(objectNode as SourceNode, namespaceName)) {
        if (args.length === 2 && args[0] && args[1]) {
          addEdit(replaceNode(call, `createComponent(${namespaceName}.dynamic(${args[0].text()}), ${args[1].text()})`));
          const importInfo = namespaceImportInfos.get(namespaceName);
          if (importInfo) addSolidExtra(importInfo.statement, "createComponent");
          state.handled.add("createDynamic");
        } else {
          state.unhandled.add("createDynamic");
        }
        continue;
      }
    }
  }

  rewriteProduceWrappers(rootNode, importedByLocal, addEdit, replaceNode, markImportRemoval, state.handled, state.unhandled);
  rewriteStorePathSetters(rootNode, imports, addEdit, replaceNode, state.handled);
  rewriteCreateStoreDirectSetters(rootNode, importedByLocal, addEdit, replaceNode, state.handled);
  rewriteOnMountCleanups(rootNode, importedByLocal, namespaceImports, addEdit, replaceNode, markImportRemoval, markImportRename, state);
  rewriteOnCleanupReturns(rootNode, importedByLocal, namespaceImports, addEdit, replaceNode, markImportRemoval, state.handled);
  rewriteSimplePropDestructuring(rootNode, addEdit, replaceNode);
  rewriteContextHookShims(rootNode, addEdit, replaceNode);
  rewriteCreateSignalIntersectionAssertions(rootNode, importedByLocal, addEdit, replaceNode, state.handled);
  rewriteDomDirectives(rootNode, addEdit, replaceNode);
  rewriteIntrinsicAttributes(rootNode, addEdit, replaceNode);
  if (/\.dispatchEvent\s*\(/.test(rootNode.text())) {
    for (const importInfo of imports) {
      if (importInfo.moduleName === "solid-js" && !importInfo.typeOnlyImport) addSolidExtra(importInfo.statement, "flush");
    }
  }
  insertInlineReviewComments(rootNode, importedByLocal, namespaceImports, state, addEdit);
  applyImportEdits(imports, state, addEdit, replaceNode);

  const handledReviewNames = new Set<string>();
  for (const name of directReviewNames) {
    if (state.handled.has(name) && !state.unhandled.has(name)) handledReviewNames.add(name);
  }
  if (state.cleanupHandled) handledReviewNames.add("onMount cleanup");

  return { handledReviewNames };
}


function rewriteCreateSignalIntersectionAssertions(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  handled: Set<string>,
): void {
  const signalTypeNames = new Set<string>();
  for (const binding of importedByLocal.values()) {
    if (binding.importedName === "Signal" && solidModules.has(binding.moduleName)) signalTypeNames.add(binding.localName);
  }
  if (signalTypeNames.size === 0) return;

  for (const assertion of rootNode.findAll({ rule: { kind: "as_expression" } })) {
    const namedChildren = assertion.children().filter((child) => child.isNamed());
    const expression = assertion.field("expression") ?? namedChildren[0] ?? null;
    const assertedType = assertion.field("type") ?? namedChildren[namedChildren.length - 1] ?? null;
    if (!expression || !assertedType || expression.kind() !== "call_expression" || assertedType.kind() !== "intersection_type") continue;
    if (!containsTypeIdentifier(assertedType, signalTypeNames)) continue;

    const callee = callFunction(expression);
    if (!callee || callee.kind() !== "identifier") continue;
    const binding = importedByLocal.get(callee.text());
    if (!binding || binding.importedName !== "createSignal" || !solidModules.has(binding.moduleName)) continue;
    if (isLocallyShadowed(callee, callee.text())) continue;

    addEdit(replaceNode(assertion, `${expression.text()} as unknown as ${assertedType.text()}`));
    handled.add("Signal assertion");
  }
}

function containsTypeIdentifier(node: SourceNode, names: Set<string>): boolean {
  const kind = node.kind();
  if ((kind === "type_identifier" || kind === "identifier") && names.has(node.text())) return true;
  return node.children().some((child) => containsTypeIdentifier(child, names));
}

function collectImports(rootNode: SourceNode): ImportStatementInfo[] {
  const result: ImportStatementInfo[] = [];
  for (const statement of rootNode.findAll({ rule: { kind: "import_statement" } })) {
    const source = statement.field("source");
    const moduleName = source ? moduleNameFromString(source) : null;
    if (!moduleName) continue;
    const namedImports = statement.find({ rule: { kind: "named_imports" } });
    const statementText = statement.text().trimStart();
    const typeOnlyImport = statementText.startsWith("import type");
    const clause = statement.find({ rule: { kind: "import_clause" } });
    const otherImportParts: string[] = [];
    if (clause) {
      for (const child of clause.children()) {
        if (child.kind() === "identifier" || child.kind() === "namespace_import") otherImportParts.push(child.text());
      }
    }
    const specifiers: ImportSpecifierInfo[] = [];
    if (namedImports) {
      for (const specifier of namedImports.children().filter((child) => child.kind() === "import_specifier")) {
        const importedName = specifier.field("name")?.text();
        if (!importedName) continue;
        const aliasName = specifier.field("alias")?.text() ?? null;
        specifiers.push({ importedName, localName: aliasName ?? importedName, aliasName, specifier });
      }
    }
    result.push({ statement, moduleName, quote: source?.text()[0] ?? '"', typeOnlyImport, otherImportParts, specifiers });
  }
  return result;
}

function moduleNameFromString(node: SourceNode): string | null {
  const text = node.text();
  if (text.length < 2) return null;
  const quote = text[0];
  if ((quote !== '"' && quote !== "'") || text[text.length - 1] !== quote) return null;
  return text.slice(1, -1);
}

function callFunction(call: SourceNode): SourceNode | null {
  return call.field("function") ?? call.children().find((child) => child.kind() === "identifier" || child.kind() === "member_expression") ?? null;
}

function callArguments(call: SourceNode): SourceNode[] {
  const args = call.field("arguments") ?? call.children().find((child) => child.kind() === "arguments") ?? null;
  if (!args) return [];
  return args.children().filter((child) => child.isNamed());
}

function callArgumentsNode(call: SourceNode): SourceNode | null {
  return call.field("arguments") ?? call.children().find((child) => child.kind() === "arguments") ?? null;
}

function callPrefix(call: SourceNode): string {
  const argsNode = callArgumentsNode(call);
  if (!argsNode) return callFunction(call)?.text() ?? "";
  const callStart = call.range().start.index;
  const argsStart = argsNode.range().start.index;
  return call.text().slice(0, Math.max(0, argsStart - callStart)).trimEnd();
}

interface CreateMemoRewrite {
  nextCallbackText: string;
  options: SourceNode | null;
  handledOn: boolean;
  wrapPreviousSourceState: boolean;
}

function rewriteCreateMemoCall(
  call: SourceNode,
  args: SourceNode[],
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
): CreateMemoRewrite | null {
  const rewrite = createMemoRewrite(args);
  if (!rewrite) return null;
  const { nextCallbackText, options } = rewrite;

  const prefix = callPrefix(call);
  const nextArgs = options ? `${nextCallbackText}, ${options.text()}` : nextCallbackText;
  const replacement = rewrite.wrapPreviousSourceState
    ? `(() => {
  let __solid2PreviousSource: unknown;
  return ${prefix}(${nextArgs});
})()`
    : `${prefix}(${nextArgs})`;
  addEdit(replaceNode(call, replacement));
  return rewrite;
}

function createMemoRewrite(args: SourceNode[]): CreateMemoRewrite | null {
  if (!args[0]) return null;
  const onRewrite = createMemoOnAccessorRewrite(args);
  if (onRewrite) return onRewrite;
  if (args.length !== 2 && args.length !== 3) return null;
  const callback = args[0];
  const initial = args[1];
  const options = args[2] ?? null;
  if (!initial) return null;

  const callbackText = callback.text();
  const nextCallbackText = callback.kind() === "arrow_function" || callback.kind() === "function_expression"
    ? callbackWithDefaultedFirstParam(callback, initial.text())
    : callbackText;
  if (nextCallbackText === null) return null;
  return { nextCallbackText, options, handledOn: false, wrapPreviousSourceState: false };
}

function createMemoOnAccessorRewrite(args: SourceNode[]): CreateMemoRewrite | null {
  if (args.length !== 1) return null;
  const onCall = args[0];
  if (!onCall || onCall.kind() !== "call_expression") return null;
  const onCallee = callFunction(onCall);
  if (onCallee?.kind() !== "identifier" || onCallee.text() !== "on") return null;
  const onArgs = callArguments(onCall);
  if (onArgs.length !== 2) return null;

  const source = onArgs[0];
  const callback = onArgs[1];
  if (!source || !callback || callback.kind() !== "arrow_function") return null;
  if (source.kind() === "array") return null;

  const params = callback.field("parameters") ?? callback.children().find((child) => child.kind() === "formal_parameters") ?? null;
  if (!params) return null;
  const parameterNodes = params.children().filter((child) => child.isNamed());
  if (parameterNodes.length !== 3) return null;
  const nextParam = parameterIdentifier(parameterNodes[0]!);
  const previousSourceParam = parameterIdentifier(parameterNodes[1]!);
  if (!nextParam || !previousSourceParam) return null;
  const previousValueParamText = parameterNodes[2]!.text();

  const body = callback.children().find((child) => child.kind() === "statement_block");
  if (!body) return null;
  const bodyText = blockBodyText(body);
  if (bodyText === null) return null;

  const nextName = nextParam.text();
  const previousSourceName = previousSourceParam.text();
  const callbackText = `(${previousValueParamText}) => {
  const ${nextName} = ${source.text()}();
  const ${previousSourceName} = __solid2PreviousSource as typeof ${nextName} | undefined;
  try {
${indentLines(bodyText, "    ")}
  } finally {
    __solid2PreviousSource = ${nextName};
  }
}`;
  return { nextCallbackText: callbackText, options: null, handledOn: true, wrapPreviousSourceState: true };
}

function parameterIdentifier(parameter: SourceNode): SourceNode | null {
  if (parameter.kind() === "identifier") return parameter;
  return parameter.children().find((child) => child.kind() === "identifier") ?? null;
}

function blockBodyText(block: SourceNode): string | null {
  const text = block.text();
  if (!text.startsWith("{") || !text.endsWith("}")) return null;
  return text.slice(1, -1).trim();
}

function indentLines(text: string, indentation: string): string {
  if (text.length === 0) return indentation;
  return text.split("\n").map((line) => line.length === 0 ? "" : `${indentation}${line}`).join("\n");
}
function callbackWithDefaultedFirstParam(callback: SourceNode, initialText: string): string | null {
  const text = callback.text();
  const params = callback.field("parameters") ?? callback.children().find((child) => child.kind() === "formal_parameters") ?? null;
  if (!params) {
    if (callback.kind() !== "arrow_function") return text;
    const arrowIndex = text.indexOf("=>");
    if (arrowIndex < 0) return null;
    const beforeArrow = text.slice(0, arrowIndex).trim();
    if (!/^[A-Za-z_$][\w$]*$/.test(beforeArrow)) return text;
    return `(${beforeArrow} = ${initialText}) ${text.slice(arrowIndex)}`;
  }

  const parameterNodes = params.children().filter((child) => child.isNamed());
  if (parameterNodes.length === 0) return text;
  if (parameterNodes.length > 1) return null;
  const parameter = parameterNodes[0]!;
  if (parameter.kind() === "assignment_pattern" || parameter.text().includes("=")) return text;
  if (parameter.kind() !== "required_parameter" && parameter.kind() !== "identifier") return null;

  const replacement = `${parameter.text()} = ${initialText}`;
  const relativeStart = parameter.range().start.index - callback.range().start.index;
  const relativeEnd = parameter.range().end.index - callback.range().start.index;
  return `${text.slice(0, relativeStart)}${replacement}${text.slice(relativeEnd)}`;
}

function memberExpressionParts(node: SourceNode): { objectNode: SourceNode | null; propertyNode: SourceNode | null } {
  const children = node.children();
  return {
    objectNode: node.field("object") ?? children.find((child) => child.kind() === "identifier") ?? null,
    propertyNode: node.field("property") ?? children.find((child) => child.kind() === "property_identifier") ?? null,
  };
}

function bindingPatternContainsName(node: SourceNode, name: string): boolean {
  const kind = node.kind();
  if ((kind === "identifier" || kind === "shorthand_property_identifier_pattern") && node.text() === name) return true;
  if (!["array_pattern", "object_pattern", "pair_pattern", "rest_pattern", "assignment_pattern"].includes(kind)) return false;
  return node.children().some((child) => bindingPatternContainsName(child, name));
}

function parameterShadowsName(parameter: SourceNode, name: string): boolean {
  const bindingNode = parameter.field("pattern") ?? parameter.field("name");
  if (bindingNode) return bindingPatternContainsName(bindingNode, name);
  return parameter.children().some((child) => bindingPatternContainsName(child, name));
}

function isFunctionLike(node: SourceNode): boolean {
  return ["function_declaration", "function_expression", "generator_function_declaration", "generator_function", "arrow_function"].includes(node.kind());
}

function functionParametersShadowName(node: SourceNode, name: string): boolean {
  const parameters = node.field("parameters") ?? node.children().find((child) => child.kind() === "formal_parameters") ?? null;
  if (parameters) return parameters.kind() === "identifier" ? parameters.text() === name : parameters.children().some((child) => parameterShadowsName(child, name));
  if (node.kind() !== "arrow_function") return false;
  return node.children().find((child) => child.kind() === "identifier")?.text() === name;
}

function blockDirectDeclarationShadowsName(node: SourceNode, name: string, referenceIndex: number): boolean {
  for (const child of node.children()) {
    const kind = child.kind();
    if (["function_declaration", "generator_function_declaration", "class_declaration"].includes(kind)) {
      if (child.field("name")?.text() === name) return true;
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
}

function catchClauseShadowsName(node: SourceNode, name: string): boolean {
  const parameter = node.field("parameter") ?? node.children().find((child) => child.kind() === "identifier" || child.kind().endsWith("_pattern")) ?? null;
  return parameter ? bindingPatternContainsName(parameter, name) : false;
}

function isLocallyShadowed(identifier: SourceNode, name: string): boolean {
  const referenceIndex = identifier.range().start.index;
  for (const ancestor of identifier.ancestors()) {
    const kind = ancestor.kind();
    if (isFunctionLike(ancestor) && functionParametersShadowName(ancestor, name)) return true;
    if ((kind === "program" || kind === "statement_block") && blockDirectDeclarationShadowsName(ancestor, name, referenceIndex)) return true;
    if (kind === "catch_clause" && catchClauseShadowsName(ancestor, name)) return true;
  }
  return false;
}

function isBindingIdentifier(node: SourceNode): boolean {
  const parent = node.parent();
  if (!parent) return false;
  const parentKind = parent.kind();
  return (
    (parentKind === "variable_declarator" && parent.field("name")?.id() === node.id()) ||
    (parentKind === "function_declaration" && parent.field("name")?.id() === node.id()) ||
    (parentKind === "required_parameter" && (parent.field("name")?.id() === node.id() || parent.children().some((child) => child.id() === node.id()))) ||
    (parentKind === "optional_parameter" && (parent.field("name")?.id() === node.id() || parent.children().some((child) => child.id() === node.id()))) ||
    (parentKind === "arrow_function" && parent.children().find((child) => child.kind() === "identifier")?.id() === node.id())
  );
}


function rewriteCapturedAccessorCreateComputed(
  call: SourceNode,
  args: SourceNode[],
  rootNode: SourceNode,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
): boolean {
  const callback = args[0];
  if (!callback || (callback.kind() !== "arrow_function" && callback.kind() !== "function_expression")) return false;

  const assignment = callback.find({ rule: { kind: "assignment_expression" } });
  if (!assignment) return false;
  const assignmentChildren = assignment.children().filter((child) => child.isNamed());
  const target = assignment.field("left") ?? assignmentChildren[0] ?? null;
  const replacement = assignment.field("right") ?? assignmentChildren[1] ?? null;
  if (!target || target.kind() !== "identifier" || !replacement || replacement.kind() !== "call_expression") return false;
  const targetName = target.text();
  const replacementText = replacement.text();
  if (!/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?\([^)]*\)$/.test(replacementText)) return false;

  const statement = call.ancestors().find((ancestor) => ancestor.kind() === "expression_statement");
  const block = statement?.ancestors().find((ancestor) => ancestor.kind() === "statement_block" || ancestor.kind() === "program");
  if (!statement || !block) return false;

  addEdit(replaceNode(statement, "void " + replacementText + ";"));

  // Keep the captured variable declaration in place to avoid whitespace-only deleted lines;
  // subsequent reads are rewritten to the accessor below.

  const replacedIdentifierIds = new Set<number>();
  for (const member of block.findAll({ rule: { kind: "member_expression" } })) {
    if (member.range().start.index <= statement.range().start.index) continue;
    if (member.ancestors().some((ancestor) => ancestor.id() === statement.id())) continue;
    const { objectNode, propertyNode } = memberExpressionParts(member);
    if (!objectNode || objectNode.kind() !== "identifier" || objectNode.text() !== targetName || !propertyNode) continue;
    replacedIdentifierIds.add(objectNode.id());
    addEdit(replaceNode(member, "(" + replacementText + " as any)." + propertyNode.text()));
  }

  for (const identifier of block.findAll({ rule: { kind: "identifier" } })) {
    if (identifier.range().start.index <= statement.range().start.index) continue;
    if (replacedIdentifierIds.has(identifier.id())) continue;
    if (identifier.text() !== targetName) continue;
    if (identifier.ancestors().some((ancestor) => ancestor.id() === statement.id())) continue;
    if (isBindingIdentifier(identifier)) continue;
    addEdit(replaceNode(identifier, replacementText));
  }

  return true;
}

function rewriteDerivedCreateComputed(call: SourceNode, args: SourceNode[], rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): boolean {
  const callback = args[0];
  if (!callback || callback.kind() !== "arrow_function") return false;
  const bodyCall = callback.children().find((child) => child.kind() === "call_expression") ?? callback.find({ rule: { kind: "call_expression" } });
  if (!bodyCall) return false;
  const setter = callFunction(bodyCall);
  const setterArg = callArguments(bodyCall)[0];
  if (!setter || setter.kind() !== "identifier" || !setterArg) return false;
  const setterName = setter.text();
  const assignedText = setterArg.text();

  for (const declarator of rootNode.findAll({ rule: { kind: "variable_declarator" } })) {
    const name = declarator.field("name");
    const value = declarator.field("value");
    if (!name || !value || value.kind() !== "call_expression") continue;
    const createSignalCallee = callFunction(value);
    if (createSignalCallee?.kind() !== "identifier" || createSignalCallee.text() !== "createSignal") continue;
    if (!name.text().includes(setterName)) continue;
    const signalArg = callArguments(value)[0];
    if (!signalArg || signalArg.text() !== assignedText) continue;
    addEdit(replaceNode(value, `createSignal(() => ${assignedText})`));
    const statement = call.ancestors().find((ancestor) => ancestor.kind() === "expression_statement");
    if (statement) addEdit(replaceNode(statement, ""));
    return true;
  }
  return false;
}

function rewriteCommonCreateSelector(call: SourceNode, args: SourceNode[], rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): boolean {
  const selectedSignal = args[0];
  if (!selectedSignal || selectedSignal.kind() !== "identifier") return false;
  const declarator = call.ancestors().find((ancestor) => ancestor.kind() === "variable_declarator");
  const declaration = call.ancestors().find((ancestor) => ancestor.kind() === "lexical_declaration");
  const selectorName = declarator?.field("name")?.text();
  if (!declarator || !declaration || !selectorName) return false;
  let rewroteUsage = false;
  for (const usage of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const usageCallee = callFunction(usage);
    const usageArg = callArguments(usage)[0];
    if (usage.id() === call.id() || usageCallee?.kind() !== "identifier" || usageCallee.text() !== selectorName || !usageArg) continue;
    addEdit(replaceNode(usage, `selected[${usageArg.text()}]`));
    rewroteUsage = true;
  }
  if (!rewroteUsage) return false;
  addEdit(replaceNode(declaration, `let previousSelectedId;\n\nconst selected = createProjection(draft => {\n  const id = ${selectedSignal.text()}();\n\n  if (previousSelectedId !== undefined) {\n    delete draft[previousSelectedId];\n  }\n\n  draft[id] = true;\n  previousSelectedId = id;\n}, {});`));
  return true;
}

function rewriteRestOnlySplitProps(call: SourceNode, args: SourceNode[], addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): boolean {
  const sourceArg = args[0];
  const selectedArg = args[1];
  if (!sourceArg || !selectedArg || selectedArg.kind() !== "array") return false;
  const declarator = call.ancestors().find((ancestor) => ancestor.kind() === "variable_declarator");
  const declaration = call.ancestors().find((ancestor) => ancestor.kind() === "lexical_declaration");
  const name = declarator?.field("name");
  if (!name || !declaration || name.kind() !== "array_pattern") return false;
  const identifiers = name.children().filter((child) => child.kind() === "identifier");
  if (identifiers.length !== 1 || !/^\[\s*,/.test(name.text().trim())) return false;
  const restName = identifiers[0]?.text();
  if (!restName) return false;
  const strings = selectedArg.children().filter((child) => child.kind() === "string").map((child) => child.text());
  if (strings.length === 0) return false;
  addEdit(replaceNode(declaration, `const ${restName} = omit(${sourceArg.text()}, ${strings.join(", ")});`));
  return true;
}

function rewriteProduceWrappers(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  markImportRemoval: (binding: ImportedBinding) => void,
  handled: Set<string>,
  unhandled: Set<string>,
): void {
  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    if (callee?.kind() !== "identifier" || callee.text() !== "produce") continue;
    const binding = importedByLocal.get(callee.text());
    if (!binding || binding.importedName !== "produce" || !solidModules.has(binding.moduleName)) continue;
    const parent = call.parent();
    const outerCall = parent?.kind() === "arguments" ? parent.parent() : null;
    const outerCallee = outerCall?.kind() === "call_expression" ? callFunction(outerCall) : null;
    const recipe = callArguments(call)[0];
    if (outerCall?.kind() === "call_expression" && outerCallee?.kind() === "identifier" && outerCallee.text().startsWith("set") && recipe) {
      addEdit(replaceNode(call, recipe.text()));
      markImportRemoval(binding);
      handled.add("produce");
    } else {
      unhandled.add("produce");
    }
  }
}

function rewriteCreateStoreDirectSetters(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  handled: Set<string>,
): void {
  const createStoreNames = new Set<string>();
  for (const binding of importedByLocal.values()) {
    if (binding.importedName === "createStore" && solidModules.has(binding.moduleName)) createStoreNames.add(binding.localName);
  }
  if (createStoreNames.size === 0) return;

  const setterDeclarations = new Map<string, SourceNode>();
  for (const declarator of rootNode.findAll({ rule: { kind: "variable_declarator" } })) {
    const pattern = declarator.field("name") ?? declarator.children().find((child) => child.kind() === "array_pattern") ?? null;
    const value = declarator.field("value") ?? declarator.children().find((child) => child.kind() === "call_expression") ?? null;
    if (!pattern || pattern.kind() !== "array_pattern" || !value || value.kind() !== "call_expression") continue;
    const callee = callFunction(value);
    if (!callee || callee.kind() !== "identifier" || !createStoreNames.has(callee.text()) || isLocallyShadowed(callee, callee.text())) continue;
    const identifiers = pattern.children().filter((child) => child.kind() === "identifier");
    const setter = identifiers[1] ?? null;
    if (setter) setterDeclarations.set(setter.text(), declarator);
  }
  if (setterDeclarations.size === 0) return;

  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    const args = callArguments(call);
    if (!callee || callee.kind() !== "identifier" || args.length !== 1) continue;
    const declaration = setterDeclarations.get(callee.text());
    if (!declaration || call.range().start.index <= declaration.range().end.index) continue;
    if (isStoreSetterReferenceShadowed(callee, callee.text(), declaration)) continue;
    const valueArg = args[0];
    if (!valueArg || isCallbackNode(valueArg) || isProduceCall(valueArg)) continue;
    addEdit(replaceNode(call, `${callee.text()}(() => ${arrowReturnExpressionText(valueArg)})`));
    handled.add("createStore direct setter");
  }
}


function isProduceCall(node: SourceNode): boolean {
  if (node.kind() !== "call_expression") return false;
  const callee = callFunction(node);
  return callee?.kind() === "identifier" && callee.text() === "produce";
}

function arrowReturnExpressionText(node: SourceNode): string {
  const text = node.text();
  return node.kind() === "object" ? `(${text})` : text;
}

function isStoreSetterReferenceShadowed(identifier: SourceNode, name: string, ignoredDeclaration: SourceNode): boolean {
  const referenceIndex = identifier.range().start.index;
  for (const ancestor of identifier.ancestors()) {
    const kind = ancestor.kind();
    if (isFunctionLike(ancestor) && functionParametersShadowName(ancestor, name)) return true;
    if ((kind === "program" || kind === "statement_block") && blockDirectDeclarationShadowsNameExcept(ancestor, name, referenceIndex, ignoredDeclaration)) return true;
    if (kind === "catch_clause" && catchClauseShadowsName(ancestor, name)) return true;
  }
  return false;
}

function blockDirectDeclarationShadowsNameExcept(node: SourceNode, name: string, referenceIndex: number, ignoredDeclaration: SourceNode): boolean {
  for (const child of node.children()) {
    const kind = child.kind();
    if (["function_declaration", "generator_function_declaration", "class_declaration"].includes(kind)) {
      if (child.field("name")?.text() === name) return true;
      continue;
    }
    if (child.range().start.index > referenceIndex) continue;
    if (kind !== "lexical_declaration" && kind !== "variable_declaration") continue;
    for (const declarator of child.children().filter((declarationChild) => declarationChild.kind() === "variable_declarator")) {
      if (declarator.id() === ignoredDeclaration.id()) continue;
      const declarationName = declarator.field("name");
      if (declarationName && bindingPatternContainsName(declarationName, name)) return true;
    }
  }
  return false;
}

function rewriteStorePathSetters(
  rootNode: SourceNode,
  imports: ImportStatementInfo[],
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  handled: Set<string>,
): void {
  const storeImport = imports.find((item) => item.specifiers.some((specifier) => specifier.importedName === "createStore"));
  if (!storeImport) return;
  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    const args = callArguments(call);
    if (callee?.kind() !== "identifier" || !callee.text().startsWith("set") || args.length < 2) continue;
    const mutationText = storeSetterMutationCallback(args);
    if (!mutationText) continue;
    addEdit(replaceNode(call, `${callee.text()}(${mutationText})`));
    handled.add("storePath");
  }
}

function storeSetterMutationCallback(args: SourceNode[]): string | null {
  if (args[0]?.kind() !== "string") return null;

  if (args.length === 4 && isCallbackNode(args[1]) && args[2]?.kind() === "string" && args[3]) {
    const predicateArg = args[1];
    const valueArg = args[3];
    if (!predicateArg || !valueArg) return null;
    const collectionAccess = storeStringKeyAccess(args[0]);
    const propertyAccess = storeStringKeyAccess(args[2]);
    if (!collectionAccess || !propertyAccess) return null;
    return `(state) => {
  const item = state${collectionAccess}.find(${predicateArg.text()});
  if (item) item${propertyAccess} = ${storeSetterAssignmentValue(valueArg, `item${propertyAccess}`)};
}`;
  }

  const finalArg = args[args.length - 1];
  if (!finalArg) return null;
  const pathArgs = args.slice(0, -1);
  if (pathArgs.some((arg) => arg.kind() !== "string")) return null;
  const targetAccess = pathArgs.map((arg) => storeStringKeyAccess(arg)).join("");
  if (!targetAccess) return null;
  return `(state) => {
  state${targetAccess} = ${storeSetterAssignmentValue(finalArg, `state${targetAccess}`)};
}`;
}

function storeSetterAssignmentValue(valueNode: SourceNode, currentValueText: string): string {
  if (isCallbackNode(valueNode)) return `(${valueNode.text()})(${currentValueText})`;
  return isReconcileCall(valueNode) ? `${valueNode.text()} as any` : valueNode.text();
}

function storeStringKeyAccess(node: SourceNode): string | null {
  const value = moduleNameFromString(node);
  if (value == null) return null;
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value) ? `.${value}` : `[${node.text()}]`;
}

function isCallbackNode(node: SourceNode | undefined): boolean {
  return node?.kind() === "arrow_function" || node?.kind() === "function_expression";
}

function isReconcileCall(node: SourceNode): boolean {
  if (node.kind() !== "call_expression") return false;
  const callee = callFunction(node);
  return callee?.kind() === "identifier" && callee.text() === "reconcile";
}

function rewriteOnMountCleanups(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  namespaceImports: Map<string, string>,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  markImportRemoval: (binding: ImportedBinding) => void,
  markImportRename: (binding: ImportedBinding, importedName: string) => void,
  state: { cleanupHandled: boolean; handled: Set<string> },
): void {
  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    const args = callArguments(call);
    const callback = args[0];
    if (!callback || callback.kind() !== "arrow_function") continue;
    let onMountBinding: ImportedBinding | null = null;
    let isSolidNamespaceOnMount = false;
    if (callee?.kind() === "identifier") {
      const binding = importedByLocal.get(callee.text());
      if (binding?.importedName === "onMount" && binding.moduleName === "solid-js") onMountBinding = binding;
    } else if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      isSolidNamespaceOnMount = propertyNode?.text() === "onMount" && objectNode?.kind() === "identifier" && namespaceImports.get(objectNode.text()) === "solid-js";
    }
    if (!onMountBinding && !isSolidNamespaceOnMount) continue;

    const block = callback.children().find((child) => child.kind() === "statement_block");
    if (!block) continue;
    for (const statement of block.children().filter((child) => child.kind() === "expression_statement")) {
      const cleanupCall = statement.children().find((child) => child.kind() === "call_expression");
      if (!cleanupCall) continue;
      const cleanupCallee = callFunction(cleanupCall);
      const cleanupArg = callArguments(cleanupCall)[0];
      if (!cleanupArg) continue;
      let cleanupBinding: ImportedBinding | null = null;
      let isNamespaceCleanup = false;
      if (cleanupCallee?.kind() === "identifier") {
        const binding = importedByLocal.get(cleanupCallee.text());
        if (binding?.importedName === "onCleanup" && binding.moduleName === "solid-js") cleanupBinding = binding;
      } else if (cleanupCallee?.kind() === "member_expression") {
        const { objectNode, propertyNode } = memberExpressionParts(cleanupCallee);
        isNamespaceCleanup = propertyNode?.text() === "onCleanup" && objectNode?.kind() === "identifier" && namespaceImports.get(objectNode.text()) === "solid-js";
      }
      if (!cleanupBinding && !isNamespaceCleanup) continue;
      addEdit(replaceNode(statement, `return ${cleanupArg.text()};`));
      if (onMountBinding) markImportRename(onMountBinding, "onSettled");
      if (cleanupBinding) markImportRemoval(cleanupBinding);
      if (isSolidNamespaceOnMount && callee?.kind() === "member_expression") addEdit(replaceNode(memberExpressionParts(callee).propertyNode as SourceNode, "onSettled"));
      state.cleanupHandled = true;
      state.handled.add("onMount cleanup");
    }
  }
}


function rewriteOnCleanupReturns(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  namespaceImports: Map<string, string>,
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
  markImportRemoval: (binding: ImportedBinding) => void,
  handled: Set<string>,
): void {
  const rewrittenBindings = new Set<ImportedBinding>();
  const rewrittenIdentifierIds = new Set<number>();

  const isSolidCall = (call: SourceNode, importedNames: Set<string>): boolean => {
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") {
      const binding = importedByLocal.get(callee.text());
      return !!binding && importedNames.has(binding.importedName) && binding.moduleName === "solid-js";
    }
    if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      return !!propertyNode && importedNames.has(propertyNode.text()) && objectNode?.kind() === "identifier" && namespaceImports.get(objectNode.text()) === "solid-js";
    }
    return false;
  };

  const isOnCleanupCall = (call: SourceNode): ImportedBinding | "namespace" | null => {
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") {
      const binding = importedByLocal.get(callee.text());
      if (binding?.importedName === "onCleanup" && binding.moduleName === "solid-js" && !isLocallyShadowed(callee, callee.text())) return binding;
      return null;
    }
    if (callee?.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      if (propertyNode?.text() === "onCleanup" && objectNode?.kind() === "identifier" && namespaceImports.get(objectNode.text()) === "solid-js") return "namespace";
    }
    return null;
  };

  const nearestFunction = (node: SourceNode): SourceNode | null => {
    return node.ancestors().find((ancestor) => ["arrow_function", "function_expression"].includes(ancestor.kind())) ?? null;
  };

  const callbackOwnerCall = (fn: SourceNode): SourceNode | null => {
    const args = fn.parent();
    const call = args?.parent();
    return args?.kind() === "arguments" && call?.kind() === "call_expression" ? call : null;
  };

  const isReactiveCleanupCallback = (node: SourceNode): boolean => {
    const fn = nearestFunction(node);
    if (!fn) return false;
    const owner = callbackOwnerCall(fn);
    if (!owner) return false;
    return isSolidCall(owner, new Set(["createEffect", "createRenderEffect", "on"]));
  };

  const isInsideOnMountCall = (node: SourceNode): boolean => {
    for (const ancestor of node.ancestors()) {
      if (ancestor.kind() === "call_expression" && isSolidCall(ancestor, new Set(["onMount"]))) return true;
    }
    return false;
  };

  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const cleanupSource = isOnCleanupCall(call);
    if (!cleanupSource || isInsideOnMountCall(call) || !isReactiveCleanupCallback(call)) continue;
    const cleanupArg = callArguments(call)[0];
    if (!cleanupArg) continue;

    const parent = call.parent();
    const callee = callFunction(call);
    if (callee?.kind() === "identifier") rewrittenIdentifierIds.add(callee.id());

    if (parent?.kind() === "expression_statement") addEdit(replaceNode(parent, "return " + cleanupArg.text() + ";"));
    else addEdit(replaceNode(call, cleanupArg.text()));

    if (cleanupSource !== "namespace") rewrittenBindings.add(cleanupSource);
    handled.add("onCleanup return");
  }

  for (const binding of rewrittenBindings) {
    if (!hasRemainingLocalReferences(rootNode, binding.localName, rewrittenIdentifierIds)) markImportRemoval(binding);
  }
}

function hasRemainingLocalReferences(rootNode: SourceNode, localName: string, ignoredIdentifierIds: Set<number>): boolean {
  for (const identifier of rootNode.findAll({ rule: { kind: "identifier" } })) {
    if (identifier.text() !== localName) continue;
    if (ignoredIdentifierIds.has(identifier.id())) continue;
    if (identifier.ancestors().some((ancestor) => ancestor.kind() === "import_statement")) continue;
    if (isBindingIdentifier(identifier)) continue;
    if (isLocallyShadowed(identifier, localName)) continue;
    return true;
  }
  return false;
}

function rewriteSimplePropDestructuring(rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): void {
  for (const fn of rootNode.findAll({ rule: { kind: "function_declaration" } })) {
    const parameters = fn.field("parameters");
    const block = fn.field("body") ?? fn.children().find((child) => child.kind() === "statement_block") ?? null;
    if (!parameters || !block) continue;
    const required = parameters.children().find((child) => child.kind() === "required_parameter");
    const objectPattern = required?.children().find((child) => child.kind() === "object_pattern");
    const prop = objectPattern?.children().find((child) => child.kind() === "shorthand_property_identifier_pattern");
    if (!required || !objectPattern || !prop) continue;
    const propertyPatterns = objectPattern
      .children()
      .filter((child) => ["shorthand_property_identifier_pattern", "pair_pattern", "assignment_pattern", "object_assignment_pattern", "rest_pattern"].includes(child.kind()));
    if (propertyPatterns.length !== 1 || propertyPatterns[0]?.id() !== prop.id()) continue;
    const propName = prop.text();
    addEdit(replaceNode(required, "props"));
    for (const identifier of block.findAll({ rule: { kind: "identifier" } })) {
      if (identifier.text() !== propName || isBindingIdentifier(identifier)) continue;
      addEdit(replaceNode(identifier, `props.${propName}`));
    }
  }
}

function rewriteContextHookShims(rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): void {
  for (const declaration of rootNode.findAll({ rule: { kind: "lexical_declaration" } })) {
    const match = declaration.text().match(/^const\s+(use[A-Za-z0-9_$]+)\s*=\s*\(\)\s*=>\s*\{\s*const\s+value\s*=\s*useContext\(([^)]+)\);\s*if\s*\(!value\)\s*throw\s+new\s+Error\("missing\s+[^\"]+\.Provider"\);\s*return\s+value;\s*\};$/s);
    if (!match) continue;
    const hookName = match[1];
    const contextName = match[2];
    if (!hookName || !contextName) continue;

    const exportStatement = declaration.parent()?.kind() === "export_statement" ? declaration.parent() : null;
    if (exportStatement) {
      addEdit(replaceNode(exportStatement, `export const ${hookName} = () => useContext(${contextName});`));
      continue;
    }

    addEdit(replaceNode(declaration, ""));
    for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
      const callee = callFunction(call);
      if (callee?.kind() === "identifier" && callee.text() === hookName) addEdit(replaceNode(call, `useContext(${contextName})`));
    }
  }
}

function rewriteDomDirectives(rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): void {
  for (const attribute of rootNode.findAll({ rule: { kind: "jsx_attribute" } })) {
    const namespaceName = attribute.children().find((child) => child.kind() === "jsx_namespace_name");
    if (!namespaceName) continue;
    const identifiers = namespaceName.children().filter((child) => child.kind() === "identifier");
    const prefix = identifiers[0]?.text();
    const name = identifiers[1]?.text();
    if (!prefix || !name || prefix === "oncapture") continue;
    const value = attributeValue(attribute, namespaceName.text());
    if (prefix === "use" && value === "true") addEdit(replaceNode(attribute, `ref={${name}}`));
    else if (prefix === "attr") addEdit(replaceNode(attribute, `${name}=${value}`));
    else if (prefix === "bool") addEdit(replaceNode(attribute, `${name}={${stripExpressionBraces(value)}}`));
    else if (prefix === "on") addEdit(replaceNode(attribute, `on${name[0]?.toUpperCase() ?? ""}${name.slice(1)}={${stripExpressionBraces(value)}}`));
    else if (prefix === "class") addEdit(replaceNode(attribute, `class={{ ${name}: ${stripExpressionBraces(value)} }}`));
    else if (prefix === "style") addEdit(replaceNode(attribute, `style={{ ${name}: ${value} }}`));
  }
}


function rewriteIntrinsicAttributes(rootNode: SourceNode, addEdit: (edit: Edit) => void, replaceNode: (node: SourceNode, text: string) => Edit): void {
  const intrinsicAttributeRenames = new Map([
    ["tabIndex", "tabindex"],
    ["readOnly", "readonly"],
  ]);

  for (const attribute of rootNode.findAll({ rule: { kind: "jsx_attribute" } })) {
    const attributeName = attribute.children().find((child) => child.kind() === "property_identifier");
    const replacement = attributeName ? intrinsicAttributeRenames.get(attributeName.text()) : null;
    if (!attributeName || !replacement) continue;

    const element = attribute.parent();
    if (!element || (element.kind() !== "jsx_opening_element" && element.kind() !== "jsx_self_closing_element")) continue;

    const tagName = jsxElementTagName(element);
    if (!tagName || !/^[a-z]/.test(tagName)) continue;

    addEdit(replaceNode(attributeName, replacement));
  }
}

function jsxElementTagName(element: SourceNode): string | null {
  const firstNamedChild = element.children().find((child) => child.isNamed());
  if (!firstNamedChild || firstNamedChild.kind() !== "identifier") return null;
  return firstNamedChild.text();
}

function attributeValue(attribute: SourceNode, name: string): string {
  const text = attribute.text().trim();
  const value = text.slice(name.length).trim();
  if (!value.startsWith("=")) return "true";
  return value.slice(1).trim();
}

function stripExpressionBraces(value: string): string {
  return value.startsWith("{") && value.endsWith("}") ? value.slice(1, -1).trim() : value;
}

function insertInlineReviewComments(
  rootNode: SourceNode,
  importedByLocal: Map<string, ImportedBinding>,
  namespaceImports: Map<string, string>,
  state: { handled: Set<string>; unhandled: Set<string> },
  addEdit: (edit: Edit) => void,
): void {
  if (rootNode.findAll({ rule: { kind: "comment" } }).some((comment) => comment.text().includes("TODO(solid-2): Review semantic migration sites"))) return;

  const insertedAt = new Set<number>();
  const insertBefore = (node: SourceNode, text: string): void => {
    const index = node.range().start.index;
    if (insertedAt.has(index)) return;
    insertedAt.add(index);
    addEdit({ startPos: index, endPos: index, insertedText: `${text}\n` });
  };

  for (const call of rootNode.findAll({ rule: { kind: "call_expression" } })) {
    const callee = callFunction(call);
    const statement = call.ancestors().find((ancestor) => ["expression_statement", "lexical_declaration"].includes(ancestor.kind()));
    if (!callee || !statement) continue;
    if (callee.kind() === "identifier") {
      const binding = importedByLocal.get(callee.text());
      if (!binding) continue;
      const args = callArguments(call);
      if (binding.importedName === "createEffect") insertBefore(statement, "// TODO(solid-2): Review createEffect split.");
      if (binding.importedName === "createRenderEffect") insertBefore(statement, "// TODO(solid-2): Review createRenderEffect split.");
      if (binding.importedName === "createMemo") {
        if (args[0]?.text().trim().startsWith("async")) insertBefore(statement, "// TODO(solid-2): Review async computation/loading boundary placement.");
        else if (args.length === 2 && !createMemoRewrite(args)) insertBefore(statement, "// TODO(solid-2): Review createMemo initial prev migration.");
      }
      if (binding.importedName === "createResource") insertBefore(statement, "// TODO(solid-2): Review createResource resource cluster.");
      if (binding.importedName === "createComputed" && !(state.handled.has("createComputed") && !state.unhandled.has("createComputed"))) insertBefore(statement, "// TODO(solid-2): Review createComputed write-back pattern.");
      if (binding.importedName === "createSelector") insertBefore(statement, "// TODO(solid-2): Review createSelector migration; createProjection rewrites require binding-safe state names.");
      if (binding.importedName === "splitProps" && !(state.handled.has("splitProps") && !state.unhandled.has("splitProps"))) insertBefore(statement, "// TODO(solid-2): Review splitProps selected-prop usage; only rest-only cases are mechanically safe.");
    } else if (callee.kind() === "member_expression") {
      const { objectNode, propertyNode } = memberExpressionParts(callee);
      const moduleName = objectNode?.kind() === "identifier" ? namespaceImports.get(objectNode.text()) : null;
      if (moduleName !== "solid-js" && moduleName !== "solid-js/store" && moduleName !== "solid-js/web" && moduleName !== "@solidjs/web") continue;
      if (propertyNode?.text() === "createDynamic" && (moduleName === "solid-js/web" || moduleName === "@solidjs/web") && callArguments(call).length === 2) continue;
      if (propertyNode?.text() === "produce") insertBefore(statement, "// TODO(solid-2): Review produce namespace usage; only direct produce wrappers are mechanically safe.");
      if (propertyNode?.text() === "createResource") insertBefore(statement, "// TODO(solid-2): Review createResource resource cluster.");
      if (propertyNode?.text() === "createDynamic") insertBefore(statement, "// TODO(solid-2): Review createDynamic namespace usage; direct two-argument calls can use createComponent(dynamic(source), props).");
    }
  }

  for (const member of rootNode.findAll({ rule: { kind: "member_expression" } })) {
    const { objectNode, propertyNode } = memberExpressionParts(member);
    const moduleName = objectNode?.kind() === "identifier" ? namespaceImports.get(objectNode.text()) : null;
    if (moduleName !== "solid-js" && moduleName !== "solid-js/store" && moduleName !== "solid-js/web" && moduleName !== "@solidjs/web") continue;
    const statement = member.ancestors().find((ancestor) => ["expression_statement", "lexical_declaration"].includes(ancestor.kind()));
    if (!statement) continue;
    const parentCall = member.parent()?.kind() === "call_expression" ? member.parent() : null;
    if (propertyNode?.text() === "createDynamic" && (moduleName === "solid-js/web" || moduleName === "@solidjs/web") && parentCall && callFunction(parentCall)?.id() === member.id() && callArguments(parentCall).length === 2) continue;
    if (propertyNode?.text() === "produce") insertBefore(statement, "// TODO(solid-2): Review produce namespace usage; only direct produce wrappers are mechanically safe.");
    if (propertyNode?.text() === "createResource") insertBefore(statement, "// TODO(solid-2): Review createResource resource cluster.");
    if (propertyNode?.text() === "createDynamic") insertBefore(statement, "// TODO(solid-2): Review createDynamic namespace usage; direct two-argument calls can use createComponent(dynamic(source), props).");
  }

  for (const importBinding of importedByLocal.values()) {
    if (importBinding.importedName === "produce" && !(state.handled.has("produce") && !state.unhandled.has("produce"))) insertBefore(importBinding.statement, "// TODO(solid-2): Review produce import; direct wrappers can be unwrapped, other uses need store-setter migration.");
  }

  for (const exportStatement of rootNode.findAll({ rule: { kind: "export_statement" } })) {
    if (!exportStatement.text().includes("export const values = [")) continue;
    insertBefore(exportStatement, "// TODO(solid-2): Review value-position removed APIs; direct call patterns may have narrower migrations.");
  }
}

function applyImportEdits(
  imports: ImportStatementInfo[],
  state: {
    importRemovals: Map<number, Set<string>>;
    importRenames: Map<number, Map<string, string>>;
    solidExtrasByStatement: Map<number, Set<string>>;
    webExtrasByStatement: Map<number, Set<string>>;
    forceSolidModuleStatements: Set<number>;
  },
  addEdit: (edit: Edit) => void,
  replaceNode: (node: SourceNode, text: string) => Edit,
): void {
  const existingSolidImports = new Set<string>();
  for (const importInfo of imports) {
    const moduleName = importSourceReplacements.get(importInfo.moduleName) ?? importInfo.moduleName;
    if (moduleName !== "solid-js") continue;
    for (const specifier of importInfo.specifiers) {
      existingSolidImports.add(specifier.aliasName ?? safeImportName(importInfo.moduleName, specifier.importedName));
    }
  }
  const emittedStandaloneSolidExtras = new Set<string>();

  for (const importInfo of imports) {
    const id = importInfo.statement.id();
    const removals = state.importRemovals.get(id) ?? new Set<string>();
    const renames = state.importRenames.get(id) ?? new Map<string, string>();
    const solidExtras = state.solidExtrasByStatement.get(id) ?? new Set<string>();
    const webExtras = state.webExtrasByStatement.get(id) ?? new Set<string>();
    if (removals.size === 0 && renames.size === 0 && solidExtras.size === 0 && webExtras.size === 0 && !state.forceSolidModuleStatements.has(id)) continue;

    const moduleName = importSourceReplacements.get(importInfo.moduleName) ?? importInfo.moduleName;
    const primarySpecifiers: string[] = [];
    const rendererTypeSpecifiers: string[] = [];
    for (const specifier of importInfo.specifiers) {
      if (removals.has(specifier.localName)) continue;
      if ((importInfo.moduleName === "solid-js" || importInfo.moduleName === "solid-js/store") && solidCompatStubImportNames.has(specifier.importedName) && !renames.has(specifier.localName)) continue;
      if ((importInfo.moduleName === "solid-js" || importInfo.moduleName === "solid-js/store") && rendererTypeNames.has(specifier.importedName) && !renames.has(specifier.localName)) {
        const alias = specifier.aliasName && specifier.aliasName !== specifier.importedName ? ` as ${specifier.aliasName}` : "";
        rendererTypeSpecifiers.push(`${specifier.importedName}${alias}`);
        continue;
      }
      const importedName = renames.get(specifier.localName) ?? safeImportName(importInfo.moduleName, specifier.importedName);
      const alias = specifier.aliasName && specifier.aliasName !== importedName ? ` as ${specifier.aliasName}` : "";
      primarySpecifiers.push(`${importedName}${alias}`);
    }
    const lines: string[] = [];
    if (moduleName === "solid-js") {
      for (const extra of solidExtras) {
        if (primarySpecifiers.includes(extra)) continue;
        if (extra === "createComponent") primarySpecifiers.unshift(extra);
        else primarySpecifiers.push(extra);
      }
    }
    if (moduleName === "@solidjs/web") {
      for (const extra of webExtras) {
        if (!primarySpecifiers.includes(extra)) primarySpecifiers.push(extra);
      }
    }

    const standaloneSolidExtras = Array.from(solidExtras).filter(
      (extra) => !existingSolidImports.has(extra) && !emittedStandaloneSolidExtras.has(extra),
    );
    if (moduleName !== "solid-js" && standaloneSolidExtras.length > 0) {
      lines.push(`import { ${standaloneSolidExtras.join(", ")} } from ${importInfo.quote}solid-js${importInfo.quote};`);
      for (const extra of standaloneSolidExtras) emittedStandaloneSolidExtras.add(extra);
    }
    const primaryParts = [...importInfo.otherImportParts];
    if (primarySpecifiers.length > 0) primaryParts.push(`{ ${primarySpecifiers.join(", ")} }`);
    if (primaryParts.length > 0) {
      const importPrefix = importInfo.typeOnlyImport ? "import type" : "import";
      lines.push(`${importPrefix} ${primaryParts.join(", ")} from ${importInfo.quote}${moduleName}${importInfo.quote};`);
    }
    if (rendererTypeSpecifiers.length > 0) {
      lines.push(`import type { ${Array.from(new Set(rendererTypeSpecifiers)).join(", ")} } from ${importInfo.quote}@solidjs/web${importInfo.quote};`);
    }
    if (moduleName !== "@solidjs/web" && webExtras.size > 0) lines.push(`import { ${Array.from(webExtras).join(", ")} } from ${importInfo.quote}@solidjs/web${importInfo.quote};`);
    addEdit(replaceNode(importInfo.statement, lines.join("\n")));
  }
}

function safeImportName(moduleName: string, importedName: string): string {
  if (moduleName === "solid-js" || moduleName === "solid-js/store") return safeImportRenames.get(importedName) ?? importedName;
  if (moduleName === "solid-js/web" || moduleName === "@solidjs/web") return webSafeImportRenames.get(importedName) ?? importedName;
  return importedName;
}
