import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { relocateLegacySubpaths } from "../rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts";
import { relocateWebPackage } from "../rules/transformations/imports/web-package-relocation/web-package-relocation.ts";
import { rewriteClassListToClass } from "../rules/transformations/jsx/class-list-to-class/class-list-to-class.ts";
import {
  composeTransformChanges,
  TRANSFORM_REPORT_STATE_KEY,
} from "../shared/transform.ts";

const transform: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const changes = composeTransformChanges([
    relocateLegacySubpaths(rootNode, filename),
    relocateWebPackage(rootNode, filename),
    rewriteClassListToClass(rootNode, filename),
  ]);

  if (changes.length === 0) return null;

  const release = acquireLock(TRANSFORM_REPORT_STATE_KEY);
  try {
    const accumulated = getState<string[]>(TRANSFORM_REPORT_STATE_KEY) ?? [];
    setState(TRANSFORM_REPORT_STATE_KEY, [
      ...new Set([...accumulated, ...changes.map(({ report }) => report)]),
    ]);
  } finally {
    release();
  }

  return rootNode.commitEdits(changes.map(({ edit }) => edit));
};

export default transform;
