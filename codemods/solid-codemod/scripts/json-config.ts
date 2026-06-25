import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JSON from "codemod:ast-grep/langs/json";

type JsonNode = SgNode<JSON>;

const SOLID_2_VERSION_RANGE = '">=2.0.0-beta.15 <2.0.0-experimental.0"';
const VITE_PLUGIN_SOLID_3_VERSION_RANGE = '"^3.0.0-next.0"';

const codemod: Codemod<JSON> = async (root) => {
  const rootNode = root.root();
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

  const pairs = rootNode.findAll({ rule: { kind: "pair" } });
  for (const pair of pairs) {
    const key = pair.field("key");
    const value = pair.field("value");
    if (!key || !value) continue;
    if (stringValue(key) === "jsxImportSource" && stringValue(value) === "solid-js") {
      addEdit(replaceNode(value, '"@solidjs/web"'));
    }
  }

  const dependencyObjectKeys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const dependencyObjectKey of dependencyObjectKeys) {
    for (const pair of pairs) {
      const key = pair.field("key");
      const value = pair.field("value");
      if (!key || !value || value.kind() !== "object") continue;
      if (stringValue(key) !== dependencyObjectKey) continue;
      const solidPair = objectPair(value, "solid-js");
      const solidVersion = solidPair?.field("value");
      const vitePluginSolidPair = objectPair(value, "vite-plugin-solid");
      const vitePluginSolidVersion = vitePluginSolidPair?.field("value");

      if (vitePluginSolidVersion) {
        addEdit(replaceNode(vitePluginSolidVersion, VITE_PLUGIN_SOLID_3_VERSION_RANGE));
      }

      if (!solidPair || !solidVersion) continue;

      addEdit(replaceNode(solidVersion, SOLID_2_VERSION_RANGE));

      const webPair = objectPair(value, "@solidjs/web");
      const webVersion = webPair?.field("value");
      if (webVersion) {
        addEdit(replaceNode(webVersion, SOLID_2_VERSION_RANGE));
        continue;
      }

      const indent = " ".repeat(solidPair.range().start.column);
      addEdit({
        startPos: solidPair.range().end.index,
        endPos: solidPair.range().end.index,
        insertedText: `,\n${indent}"@solidjs/web": ${SOLID_2_VERSION_RANGE}`,
      });
    }
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
