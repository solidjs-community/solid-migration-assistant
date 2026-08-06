import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { transformWebImport } from "./web-import.ts";

const testWebImportRule: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits = transformWebImport(rootNode);
  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default testWebImportRule;
