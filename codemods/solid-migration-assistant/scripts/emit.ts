import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { acquireLock, getState, setState } from "codemod:workflow";
import { ANALYSIS_STATE_KEY } from "../shared/analysis.ts";

const EMITTED_STATE_KEY = "solid-migration-assistant-guidance-emitted";

const emit: Codemod<TSX> = async () => {
  const release = acquireLock(EMITTED_STATE_KEY);
  try {
    if (getState<boolean>(EMITTED_STATE_KEY)) return null;

    const guidance = [
      ...new Set(getState<string[]>(ANALYSIS_STATE_KEY) ?? []),
    ].sort();
    setState(EMITTED_STATE_KEY, true, false);

    if (guidance.length > 0) {
      console.warn(guidance.join("\n\n"));
    }
  } finally {
    release();
  }

  return null;
};

export default emit;
