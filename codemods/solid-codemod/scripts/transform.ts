import type { Codemod, Edit } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { transformWebImport } from "../rules/imports/web-import.ts";

const transforms = [transformWebImport];

const transform: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const edits = transforms.flatMap((applyTransform) =>
    applyTransform(rootNode),
  );
  assertNoOverlaps(edits);

  return edits.length > 0 ? rootNode.commitEdits(edits) : null;
};

export function assertNoOverlaps(edits: Edit[]): void {
  const sorted = [...edits].sort(
    (left, right) => left.startPos - right.startPos || left.endPos - right.endPos,
  );
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1];
    const current = sorted[index];
    if (
      previous &&
      current &&
      (current.startPos < previous.endPos ||
        current.startPos === previous.startPos)
    ) {
      throw new Error(
        `safe transforms produced overlapping edits at ${current.startPos}-${Math.min(previous.endPos, current.endPos)}`,
      );
    }
  }
}

export default transform;
