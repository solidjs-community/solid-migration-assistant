import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { relocateLegacySubpaths } from "../rules/transformations/imports/legacy-subpath-relocation/legacy-subpath-relocation.ts";
import { TRANSFORM_REPORT_STATE_KEY } from "../shared/transform.ts";

const transform: Codemod<TSX> = async (root) => {
  const rootNode = root.root();
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const { edits, report } = relocateLegacySubpaths(rootNode, filename);

  if (edits.length === 0) return null;

  const release = acquireLock(TRANSFORM_REPORT_STATE_KEY);
  try {
    const accumulated = getState<string[]>(TRANSFORM_REPORT_STATE_KEY) ?? [];
    setState(TRANSFORM_REPORT_STATE_KEY, [
      ...new Set([...accumulated, ...report.findings.map((finding) => finding.guidance)]),
    ]);
  } finally {
    release();
  }

  return rootNode.commitEdits(edits);
};

export default transform;
