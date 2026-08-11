import type { SgNode } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import {
  findDirectImportedCalls,
  siteGuidance,
} from "../../../shared/analysis.ts";

const CREATE_RULE_ID = "S2-STORE-CREATE-MUTABLE-001";
const MODIFY_RULE_ID = "S2-STORE-MODIFY-MUTABLE-001";
const STORE_MODULE = "solid-js/store";

export function analyzeCreateMutable(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, STORE_MODULE, "createMutable")
    .filter(
      ({ argumentNodes }) =>
        (argumentNodes.length === 1 || argumentNodes.length === 2) &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, argumentNodes, filename }) =>
      siteGuidance(
        call,
        filename,
        CREATE_RULE_ID,
        "Plan this createMutable migration to createStore.",
        `Solid 2 removes createMutable in favor of createStore with explicit setter-based updates; this call has ${argumentNodes.length} argument(s), while createStore also changes the created value from a directly mutable proxy to a store-and-setter tuple.`,
        "Next step: trace this value through all call sites, aliases, returned values, and property writes; introduce createStore only after mapping every assignment, delete, and mutating array operation to an explicit setter update and reviewing any options argument separately. Stop without proposing a rewrite when the value escapes, consumers require direct mutation or proxy identity, mutation happens through unknown helpers, setter paths cannot be identified, ownership is unclear, or focused tests do not cover reads and writes. This analyzer does not edit code.",
      ),
    );
}

export function analyzeModifyMutable(
  rootNode: SgNode<TSX>,
  context: { filename: string },
): string[] {
  return findDirectImportedCalls(rootNode, STORE_MODULE, "modifyMutable")
    .filter(
      ({ argumentNodes }) =>
        argumentNodes.length === 2 &&
        !argumentNodes.some((argument) => argument.kind() === "spread_element"),
    )
    .map(({ call, filename }) =>
      siteGuidance(
        call,
        filename,
        MODIFY_RULE_ID,
        "Move this mutable update to an explicit store setter.",
        "Solid 2 removes modifyMutable as mutable stores migrate to createStore; updates must go through an explicit setter, whose draft-first callback replaces this mutation entry point only after the target store is known.",
        "Next step: resolve the first argument back to its createMutable owner, inspect the entire mutation recipe, and map the update to that createStore tuple's explicit setter while preserving any path selection and sequencing. Stop without proposing a rewrite when the target origin or setter is unknown, the state or recipe escapes, mutation is delegated to an unknown helper, the callback returns a meaningful value, nested updates or async work are present, or tests do not expose the affected reads and writes. This analyzer does not edit code.",
      ),
    );
}
