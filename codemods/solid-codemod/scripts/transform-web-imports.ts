import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findStaticWebImports,
  replacementModuleLiteral,
} from "./static-web-imports.ts";

const transformWebImports: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits = findStaticWebImports(rootNode).map(({ source }) =>
    source.replace(replacementModuleLiteral(source)),
  );

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export default transformWebImports;
