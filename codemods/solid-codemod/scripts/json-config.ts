import type { Codemod, Edit, SgNode } from "codemod:ast-grep";
import type JSON from "codemod:ast-grep/langs/json";

type JsonNode = SgNode<JSON>;

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
      addEdit(value.replace('"@solidjs/web"'));
    }
  }

  const dependencyObjectKeys = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];
  for (const dependencyObjectKey of dependencyObjectKeys) {
    for (const pair of pairs) {
      const key = pair.field("key");
      const value = pair.field("value");
      if (!key || !value || value.kind() !== "object") continue;
      if (stringValue(key) !== dependencyObjectKey) continue;
      if (objectPair(value, "@solidjs/web")) continue;

      const solidPair = objectPair(value, "solid-js");
      const solidVersion = solidPair?.field("value");
      if (!solidPair || !solidVersion) continue;

      const indent = " ".repeat(solidPair.range().start.column);
      addEdit({
        startPos: solidPair.range().end.index,
        endPos: solidPair.range().end.index,
        insertedText: `,\n${indent}"@solidjs/web": ${solidVersion.text()}`,
      });
    }
  }

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default codemod;
