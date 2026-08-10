import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeJsxClassListAttributes } from "./class-list.ts";

const testJsxClassListAttributes: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const guidance = analyzeJsxClassListAttributes(root.root(), { filename });
  const expectedLocations = ["8:14", "10:23", "11:15", "13:14"];

  if (guidance.length !== expectedLocations.length) {
    throw new Error(
      `expected ${expectedLocations.length} JSX classList guidance entries, got ${guidance.length}`,
    );
  }

  guidance.forEach((entry, index) => {
    const required = [
      `${filename}:${expectedLocations[index]} [S2-JSX-CLASSLIST-001]`,
      "classList",
      "class object/array form",
      "Why:",
      "Guidance:",
      "This analyzer does not edit source",
      "Stop",
    ];
    if (required.some((text) => !entry.includes(text))) {
      throw new Error(`incomplete JSX classList guidance: ${entry}`);
    }
  });

  return null;
};

export default testJsxClassListAttributes;
