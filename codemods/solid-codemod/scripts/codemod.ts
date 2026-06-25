import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

type SourceLanguage = TSX;
type SourceNode = SgNode<SourceLanguage>;

interface ImportedRename {
  from: string;
  to: string;
  binding: SourceNode;
}

interface JsxComponentRename {
  localName: string;
  replacementName: string;
  addKeyedFalse: boolean;
  rewriteRevealProps: boolean;
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

const rendererTypeNames = new Set(["JSX", "ComponentProps"]);
const reviewOnlyNames = new Set([
  "batch",
  "catchError",
  "createComputed",
  "createDeferred",
  "createDynamic",
  "createMutable",
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
  const importedRenames: ImportedRename[] = [];
  const jsxComponentRenames: JsxComponentRename[] = [];
  const semanticReviewNames = new Set<string>();
  const contextNames = new Set<string>();
  const source = root.source();
  let insertedSemanticReviewMarker = source.includes("TODO(solid-2): Review semantic migration sites");

  const addEdit = (edit: Edit): void => {
    const key = `${edit.startPos}:${edit.endPos}`;
    if (editRanges.has(key)) return;
    editRanges.add(key);
    edits.push(edit);
  };

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

  const rewriteTagName = (node: SourceNode, localName: string, replacementName: string): string => {
    const text = node.text();
    if (text.startsWith(`</${localName}`)) return text.replace(`</${localName}`, `</${replacementName}`);
    if (text.startsWith(`<${localName}`)) return text.replace(`<${localName}`, `<${replacementName}`);
    return text;
  };

  const transformRevealTag = (node: SourceNode, localName: string, replacementName: string): string => {
    let text = rewriteTagName(node, localName, replacementName);
    text = text.replace(/\s+revealOrder\s*=\s*"forwards"/g, "");
    text = text.replace(/\s+revealOrder\s*=\s*{\s*"forwards"\s*}/g, "");
    text = text.replace(/\s+revealOrder\s*=\s*"together"/g, ' order="together"');
    text = text.replace(/\s+revealOrder\s*=\s*{\s*"together"\s*}/g, ' order="together"');
    text = text.replace(/\s+tail\s*=\s*"collapsed"/g, " collapsed");
    text = text.replace(/\s+tail\s*=\s*{\s*"collapsed"\s*}/g, " collapsed");
    return text;
  };

  const transformIndexTag = (node: SourceNode, localName: string, replacementName: string): string => {
    let text = rewriteTagName(node, localName, replacementName);
    if (jsxAttribute(node, "keyed")) return text;
    if (text.endsWith("/>")) return `${text.slice(0, -2)} keyed={false} />`;
    if (text.endsWith(">")) return `${text.slice(0, -1)} keyed={false}>`;
    return text;
  };

  const specifierText = (specifier: SourceNode, importedName: string, aliasName: string | null, typeOnlyImport: boolean): string => {
    const inlineType = specifier.text().trim().startsWith("type ");
    const typePrefix = !typeOnlyImport && inlineType ? "type " : "";
    if (aliasName) return `${typePrefix}${importedName} as ${aliasName}`;
    return `${typePrefix}${importedName}`;
  };

  const importStatements = rootNode.findAll({ rule: { kind: "import_statement" } });
  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (originalModuleName !== "solid-js" && originalModuleName !== "solid-js/store" && originalModuleName !== "solid-js/web") continue;
    for (const specifier of importStatement.findAll({ rule: { kind: "import_specifier" } })) {
      const importedName = specifier.field("name")?.text();
      if (importedName && reviewOnlyNames.has(importedName)) semanticReviewNames.add(importedName);
    }
  }

  for (const importStatement of importStatements) {
    const sourceNode = importStatement.field("source");
    if (!sourceNode) continue;
    const originalModuleName = moduleNameFromString(sourceNode);
    if (!originalModuleName) continue;

    const replacementModuleName = importSourceReplacements.get(originalModuleName) ?? originalModuleName;
    const quote = sourceNode.text()[0] ?? '"';
    const statementText = importStatement.text();
    const typeOnlyImport = /^import\s+type\b/.test(statementText);
    const namedImports = importStatement.find({ rule: { kind: "named_imports" } });

    if (!namedImports) {
      if (replacementModuleName !== originalModuleName) addEdit(sourceNode.replace(`${quote}${replacementModuleName}${quote}`));
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
    const rendererTypeSpecifiers: string[] = [];
    let changedNamedImport = false;
    const importSpecifiers = namedImports.children().filter((child) => child.kind() === "import_specifier");

    for (const specifier of importSpecifiers) {
      const importedNode = specifier.field("name");
      if (!importedNode) continue;
      const importedName = importedNode.text();
      const aliasNode = specifier.field("alias");
      const aliasName = aliasNode?.text() ?? null;
      const localName = aliasName ?? importedName;
      const isRendererType = originalModuleName === "solid-js" && rendererTypeNames.has(importedName) && (typeOnlyImport || specifier.text().trim().startsWith("type "));

      if (isRendererType) {
        rendererTypeSpecifiers.push(specifierText(specifier, importedName, aliasName, true));
        changedNamedImport = true;
        continue;
      }

      const replacementName = safeImportRenames.get(importedName);
      if (replacementName && (originalModuleName === "solid-js" || originalModuleName === "solid-js/store")) {
        primarySpecifiers.push(specifierText(specifier, replacementName, aliasName, typeOnlyImport));
        changedNamedImport = true;
        if (!aliasName) importedRenames.push({ from: importedName, to: replacementName, binding: importedNode });
        if (importedName === "Suspense" || importedName === "SuspenseList" || importedName === "ErrorBoundary" || importedName === "Index") {
          jsxComponentRenames.push({
            localName,
            replacementName: aliasName ?? replacementName,
            addKeyedFalse: importedName === "Index",
            rewriteRevealProps: importedName === "SuspenseList",
          });
        }
        continue;
      }

      primarySpecifiers.push(specifierText(specifier, importedName, aliasName, typeOnlyImport));
    }

    if (!changedNamedImport && replacementModuleName === originalModuleName) continue;

    const importLines: string[] = [];
    const primaryParts = [...otherImportParts];
    if (primarySpecifiers.length > 0) primaryParts.push(`{ ${primarySpecifiers.join(", ")} }`);
    if (primaryParts.length > 0) {
      const importPrefix = typeOnlyImport ? "import type" : "import";
      importLines.push(`${importPrefix} ${primaryParts.join(", ")} from ${quote}${replacementModuleName}${quote};`);
    }
    if (rendererTypeSpecifiers.length > 0) {
      importLines.push(`import type { ${rendererTypeSpecifiers.join(", ")} } from ${quote}@solidjs/web${quote};`);
    }

    let replacement = importLines.join("\n");
    if (!insertedSemanticReviewMarker && semanticReviewNames.size > 0) {
      replacement = `// TODO(solid-2): Review semantic migration sites in this file: ${Array.from(semanticReviewNames).sort().join(", ")}.\n${replacement}`;
      insertedSemanticReviewMarker = true;
    }
    addEdit(importStatement.replace(replacement));
  }

  if (!insertedSemanticReviewMarker && semanticReviewNames.size > 0 && importStatements[0]) {
    const firstImport = importStatements[0];
    const replacement = `// TODO(solid-2): Review semantic migration sites in this file: ${Array.from(semanticReviewNames).sort().join(", ")}.\n${firstImport.text()}`;
    addEdit(firstImport.replace(replacement));
    insertedSemanticReviewMarker = true;
  }

  for (const importedRename of importedRenames) {
    const references = importedRename.binding.references();
    for (const fileReferences of references) {
      if (fileReferences.root.filename() !== root.filename()) continue;
      for (const reference of fileReferences.nodes) {
        if (reference.text() !== importedRename.from) continue;
        if (reference.ancestors().some((ancestor) => ancestor.kind() === "import_statement")) continue;
        addEdit(reference.replace(importedRename.to));
      }
    }
  }

  const createContextDeclarators = rootNode.findAll({
    rule: {
      kind: "variable_declarator",
      has: { field: "value", pattern: "createContext($$$ARGS)" },
    },
  });
  for (const declarator of createContextDeclarators) {
    const name = declarator.field("name");
    if (name?.kind() === "identifier") contextNames.add(name.text());
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
      const contextName = name.text().slice(0, -".Provider".length);
      if (contextNames.has(contextName)) addEdit(name.replace(contextName));
      continue;
    }

    if (name.kind() !== "identifier") continue;
    const localName = name.text();
    const componentRename = jsxComponentRenames.find((rename) => rename.localName === localName);
    if (!componentRename) continue;

    if (componentRename.addKeyedFalse && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
      addEdit(tag.replace(transformIndexTag(tag, localName, componentRename.replacementName)));
      continue;
    }

    if (componentRename.rewriteRevealProps && (tag.kind() === "jsx_opening_element" || tag.kind() === "jsx_self_closing_element")) {
      addEdit(tag.replace(transformRevealTag(tag, localName, componentRename.replacementName)));
      continue;
    }

    if (componentRename.replacementName !== localName) addEdit(name.replace(componentRename.replacementName));
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
      addEdit(classListAttribute.replace(`class={${jsxAttributeValue(classListAttribute, "classList")}}`));
      continue;
    }

    const nextClassAttribute = `class={[${jsxAttributeValue(classAttribute, "class")}, ${jsxAttributeValue(classListAttribute, "classList")}]}`;
    const nextTag = tag.text().replace(classAttribute.text(), nextClassAttribute).replace(classListAttribute.text(), "").replace(/\s+([/>])/g, "$1");
    addEdit(tag.replace(nextTag));
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
