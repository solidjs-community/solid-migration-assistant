import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

type SourceLanguage = TSX;
type SourceNode = SgNode<SourceLanguage>;

interface JsxComponentRename {
  localName: string;
  replacementName: string;
  addKeyedFalse: boolean;
  rewriteRevealProps: boolean;
  rewriteErrorFallback: boolean;
}

const importSourceReplacements = new Map<string, string>([
  ["solid-js/web", "@solidjs/web"],
  ["solid-js/h", "@solidjs/h"],
  ["solid-js/html", "@solidjs/html"],
  ["solid-js/universal", "@solidjs/universal"],
  ["solid-js/store", "solid-js"],
  ["solid-js/jsx-runtime", "@solidjs/web/jsx-runtime"],
  ["solid-js/jsx-dev-runtime", "@solidjs/web/jsx-dev-runtime"],
]);

const safeImportRenames = new Map<string, string>([
  ["Suspense", "Loading"],
  ["SuspenseList", "Reveal"],
  ["ErrorBoundary", "Errored"],
  ["Index", "For"],
  ["mergeProps", "merge"],
  ["unwrap", "snapshot"],
  ["onMount", "onSettled"],
  ["equalFn", "isEqual"],
  ["getListener", "getObserver"],
]);

const webSafeImportRenames = new Map<string, string>([["addEventListener", "addEvent"]]);
const webReviewOnlyNames = new Set([
  "Aliases",
  "Properties",
  "classList",
  "clearDelegatedEvents",
  "getPropAlias",
  "setBoolAttribute",
  "ssrSpread",
  "use",
]);

const rendererTypeNames = new Set(["JSX", "ComponentProps"]);
const solidTypeRenames = new Map<string, string>([["JSXElement", "Element"]]);
const removedDomDirectivePrefixes = new Set(["use", "attr", "bool", "on", "oncapture", "class", "style"]);
const reviewOnlyNames = new Set([
  "batch",
  "catchError",
  "createComputed",
  "createEffect",
  "createDeferred",
  "createDynamic",
  "createMemo",
  "createMutable",
  "createRenderEffect",
  "createResource",
  "createSelector",
  "enableScheduling",
  "from",
  "indexArray",
  "modifyMutable",
  "observable",
  "on",
  "onError",
  "produce",
  "resetErrorBoundaries",
  "splitProps",
  "startTransition",
  "useTransition",
  "writeSignal",
]);

const codemod: Codemod<SourceLanguage> = async (root) => {
  const rootNode = root.root();
  const edits: Edit[] = [];
  const editRanges = new Set<string>();
  const usageRenames = new Map<string, string>();
  const jsxComponentRenames: JsxComponentRename[] = [];
  const semanticReviewNames = new Set<string>();
  const contextNames = new Set<string>();
  const contextDeclaratorIds = new Set<number>();
  const source = root.source();
  let insertedSemanticReviewMarker = source.includes("TODO(solid-2): Review semantic migration sites");

  const addEdit = (edit: Edit): void => {
    const key = `${edit.startPos}:${edit.endPos}`;
    if (editRanges.has(key)) return;
    editRanges.add(key);
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
      return objectNode?.id() === identifier.id() && (propertyNode?.text() === "message" || propertyNode?.text() === "name");
    }
    if (parent.kind() !== "call_expression" || callFunction(parent)?.id() !== identifier.id()) return false;
    const member = parent.parent();
    if (member?.kind() !== "member_expression") return true;
    const { objectNode, propertyNode } = memberExpressionParts(member);
    return objectNode?.id() === parent.id() && (propertyNode?.text() === "message" || propertyNode?.text() === "name");
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
      if (propertyName !== "message" && propertyName !== "name") continue;
      if (isShadowedBeforeAncestor(objectNode, errorName, callback)) continue;

      addEdit(replaceNode(member, `${errorName}().${propertyName}`));
    }

    for (const identifier of callback.findAll({ rule: { kind: "identifier" } })) {
      if (identifier.text() !== errorName) continue;
      if (isBindingIdentifier(identifier)) continue;
      if (isShadowedBeforeAncestor(identifier, errorName, callback)) continue;
      if (isSafeErrorAccessorUse(identifier)) continue;
      semanticReviewNames.add("ErrorBoundary fallback");
    }
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

  const importStatements = rootNode.findAll({ rule: { kind: "import_statement" } });
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
  const onMountLocalNames = new Set<string>();
  const onCleanupLocalNames = new Set<string>();
  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (originalModuleName !== "solid-js" && originalModuleName !== "solid-js/store" && originalModuleName !== "solid-js/web" && originalModuleName !== "@solidjs/web") continue;
    const statementText = importStatement.text().trimStart();
    const typeOnlyImport = statementText.startsWith("import type");
    const namespaceImport = importStatement.find({ rule: { kind: "namespace_import" } });
    const namespaceLocal = namespaceImport?.children().find((child) => child.kind() === "identifier")?.text();
    if (namespaceLocal) namespaceImports.set(namespaceLocal, originalModuleName);
    for (const specifier of importStatement.findAll({ rule: { kind: "import_specifier" } })) {
      const importedName = specifier.field("name")?.text();
      if (importedName && reviewOnlyNames.has(importedName)) semanticReviewNames.add(importedName);
      if (originalModuleName === "solid-js" && importedName === "createContext") {
        createContextLocalNames.add(specifier.field("alias")?.text() ?? importedName);
      }
      if (originalModuleName === "solid-js" && importedName === "createMemo") {
        createMemoLocalNames.add(specifier.field("alias")?.text() ?? importedName);
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
        const localName = aliasName ?? importedName;
        if (jsxElementNamespaceLocals.has(localName) && !unsafeJsxNamespaceLocals.has(localName)) {
          jsxNamespaceElementRenames.add(localName);
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

  const typeUsageRenames = new Map<string, string>();
  const emittedNamedImportBindings = new Set<string>();
  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (!originalModuleName) continue;

    const replacementModuleName = importSourceReplacements.get(originalModuleName) ?? originalModuleName;
    const quote = sourceNode.text()[0] ?? '"';
    const statementText = importStatement.text().trimStart();
    const typeOnlyImport = statementText.startsWith("import type");
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
        addPrimarySpecifier(specifierText(specifier, importedName, aliasName, typeOnlyImport), importedName, aliasName, isTypeOnlySpecifier);
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
        addPrimarySpecifier(specifierText(specifier, replacementName, aliasName, typeOnlyImport), replacementName, aliasName, isTypeOnlySpecifier);
        changedNamedImport = true;
        if (!aliasName) usageRenames.set(importedName, replacementName);
        if (importedName === "Suspense" || importedName === "SuspenseList" || importedName === "ErrorBoundary" || importedName === "Index") {
          jsxComponentRenames.push({
            localName,
            replacementName: aliasName ?? replacementName,
            addKeyedFalse: importedName === "Index",
            rewriteRevealProps: importedName === "SuspenseList",
            rewriteErrorFallback: importedName === "ErrorBoundary",
          });
        }
        continue;
      }

      addPrimarySpecifier(specifierText(specifier, importedName, aliasName, typeOnlyImport), importedName, aliasName, isTypeOnlySpecifier);
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
      if (!replacement) continue;
      addEdit(replaceNode(propertyNode, replacement));
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

    const name = declarator.field("name");
    if (name?.kind() === "identifier") {
      contextNames.add(name.text());
      contextDeclaratorIds.add(declarator.id());
    }
  }

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
      if (propertyNode?.text() === "Provider" && objectNode?.kind() === "identifier" && contextNames.has(contextName) && !isContextNameShadowed(objectNode, contextName)) {
        addEdit(replaceNode(name, contextName));
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
        if (keyed) addEdit(replaceNode(keyed, "keyed={false}"));
        else addEdit(insertBeforeJsxTagClose(tag, " keyed={false}"));
      }

      if (propertyName === "SuspenseList" && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
        const revealOrder = jsxAttribute(tag, "revealOrder");
        if (revealOrder) {
          const value = jsxAttributeValue(revealOrder, "revealOrder");
          if (value === '"forwards"' || value === "'forwards'") addEdit(replaceNode(revealOrder, ""));
          else if (value === '"together"' || value === "'together'") addEdit(replaceNode(revealOrder, 'order="together"'));
          else semanticReviewNames.add("SuspenseList props");
        }
        const tail = jsxAttribute(tag, "tail");
        if (tail) {
          const value = jsxAttributeValue(tail, "tail");
          if (value === '"collapsed"' || value === "'collapsed'") addEdit(replaceNode(tail, "collapsed"));
          else semanticReviewNames.add("SuspenseList props");
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
      if (keyed) addEdit(replaceNode(keyed, "keyed={false}"));
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
        else semanticReviewNames.add("SuspenseList props");
      }
      const tail = jsxAttribute(tag, "tail");
      if (tail) {
        const value = jsxAttributeValue(tail, "tail");
        if (value === '"collapsed"' || value === "'collapsed'") addEdit(replaceNode(tail, "collapsed"));
        else semanticReviewNames.add("SuspenseList props");
      }
      continue;
    }

    if (componentRename.replacementName !== localName) addEdit(replaceNode(name, componentRename.replacementName));
  }

  const jsxOpenTags = rootNode.findAll({
    rule: {
      any: [{ kind: "jsx_opening_element" }, { kind: "jsx_self_closing_element" }],
    },
  });
  for (const tag of jsxOpenTags) {
    const classListAttribute = jsxAttribute(tag, "classList");
    if (!classListAttribute) continue;
    const classAttribute = jsxAttribute(tag, "class");

    if (!classAttribute) {
      addEdit(replaceNode(classListAttribute, `class={${jsxAttributeValue(classListAttribute, "classList")}}`));
      continue;
    }

    const nextClassAttribute = `class={[${jsxAttributeValue(classAttribute, "class")}, ${jsxAttributeValue(classListAttribute, "classList")}]}`;
    addEdit(replaceNode(classAttribute, nextClassAttribute));
    addEdit(replaceNode(classListAttribute, ""));
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
