import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JSON from "codemod:ast-grep/langs/json";

type JsonNode = SgNode<JSON>;

const SOLID_2_VERSION_RANGE = '">=2.0.0-beta.15 <2.0.0-experimental.0"';
const VITE_PLUGIN_SOLID_3_VERSION_RANGE = '"^3.0.0-next.0"';
const SOLID_TESTING_LIBRARY_1_VERSION_RANGE = '"^1.0.0-beta.2"';
const BABEL_PRESET_SOLID_2_VERSION_RANGE = '">=2.0.0-beta.15 <2.0.0-experimental.0"';
const SOLID_ROUTER_NEXT_VERSION_RANGE = '"^0.17.0-next.3"';
const jsxImportSourceReplacements = new Map<string, string>([
  ["solid-js", "@solidjs/web"],
  ["solid-js/h", "@solidjs/h"],
]);

const codemod: Codemod<JSON> = async (root) => {
  const rootNode = root.root();
  const source = root.source();
  const edits: Edit[] = [];
  const editRanges = new Set<string>();

  const addEdit = (edit: Edit): void => {
    const key = `${edit.startPos}:${edit.endPos}`;
    if (editRanges.has(key)) return;
    editRanges.add(key);
    edits.push(edit);
  };

  const replaceNode = (node: JsonNode, insertedText: string): Edit => ({
    startPos: node.range().start.index,
    endPos: node.range().end.index,
    insertedText,
  });

  const stringValue = (node: JsonNode): string | null => {
    const text = node.text();
    if (text.length < 2) return null;
    if (text[0] !== '"' || text[text.length - 1] !== '"') return null;
    return text.slice(1, -1);
  };

  const objectPair = (objectNode: JsonNode, key: string): JsonNode | null => {
    for (const child of objectNode.children()) {
      if (child.kind() !== "pair") continue;
      const childKey = child.field("key");
      if (childKey && stringValue(childKey) === key) return child;
    }
    return null;
  };

  const insertObjectPair = (objectNode: JsonNode, key: string, valueText: string): Edit | null => {
    const pairs = objectNode.children().filter((child) => child.kind() === "pair");
    const lastPair = pairs[pairs.length - 1];
    if (!lastPair) return null;
    const lineStart = source.lastIndexOf("\n", lastPair.range().start.index) + 1;
    const indentation = source.slice(lineStart, lastPair.range().start.index).match(/^\s*/)?.[0] ?? "";
    return {
      startPos: lastPair.range().end.index,
      endPos: lastPair.range().end.index,
      insertedText: `,\n${indentation}"${key}": ${valueText}`,
    };
  };

  const rootObject = rootNode.children().find((child) => child.kind() === "object") ?? rootNode;
  const packageLockPackages = objectPair(rootObject, "packages")?.field("value") ?? null;
  const packageLockRootPackage = packageLockPackages?.kind() === "object" ? objectPair(packageLockPackages, "")?.field("value") ?? null : null;
  const isPackageLock = objectPair(rootObject, "lockfileVersion") !== null || packageLockRootPackage !== null;

  const isRelevantDependencyObjectPair = (pair: JsonNode): boolean => {
    const parentObject = pair.parent();
    if (!parentObject || parentObject.kind() !== "object") return false;
    if (isPackageLock) return packageLockRootPackage?.id() === parentObject.id();
    return parentObject.id() === rootObject.id();
  };

  const pairs = rootNode.findAll({ rule: { kind: "pair" } });
  for (const pair of pairs) {
    const key = pair.field("key");
    const value = pair.field("value");
    if (!key || !value) continue;
    if (stringValue(key) === "jsxImportSource") {
      const replacement = jsxImportSourceReplacements.get(stringValue(value) ?? "");
      if (replacement) addEdit(replaceNode(value, `"${replacement}"`));
    }
  }

  const dependencyObjectKeys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const dependencyObjectKey of dependencyObjectKeys) {
    for (const pair of pairs) {
      const key = pair.field("key");
      const value = pair.field("value");
      if (!key || !value || value.kind() !== "object") continue;
      if (stringValue(key) !== dependencyObjectKey) continue;
      if (!isRelevantDependencyObjectPair(pair)) continue;
      const solidPair = objectPair(value, "solid-js");
      const solidVersion = solidPair?.field("value");
      const vitePluginSolidPair = objectPair(value, "vite-plugin-solid");
      const vitePluginSolidVersion = vitePluginSolidPair?.field("value");
      const testingLibraryPair = objectPair(value, "@solidjs/testing-library");
      const testingLibraryVersion = testingLibraryPair?.field("value");
      const routerPair = objectPair(value, "@solidjs/router");
      const routerVersion = routerPair?.field("value");
      const babelPresetSolidPair = objectPair(value, "babel-preset-solid");
      const babelPresetSolidVersion = babelPresetSolidPair?.field("value");

      if (vitePluginSolidVersion) {
        addEdit(replaceNode(vitePluginSolidVersion, VITE_PLUGIN_SOLID_3_VERSION_RANGE));
      }

      if (testingLibraryVersion) {
        addEdit(replaceNode(testingLibraryVersion, SOLID_TESTING_LIBRARY_1_VERSION_RANGE));
      }

      if (routerVersion) {
        addEdit(replaceNode(routerVersion, SOLID_ROUTER_NEXT_VERSION_RANGE));
      }

      if (babelPresetSolidVersion) {
        addEdit(replaceNode(babelPresetSolidVersion, BABEL_PRESET_SOLID_2_VERSION_RANGE));
      }

      const webPair = objectPair(value, "@solidjs/web");
      const webVersion = webPair?.field("value");
      if (webVersion) {
        addEdit(replaceNode(webVersion, SOLID_2_VERSION_RANGE));
      }

      if (!solidPair || !solidVersion) continue;

      addEdit(replaceNode(solidVersion, SOLID_2_VERSION_RANGE));
      if (!webPair) {
        const insertWebDependency = insertObjectPair(value, "@solidjs/web", SOLID_2_VERSION_RANGE);
        if (insertWebDependency) addEdit(insertWebDependency);
      }

    }
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
