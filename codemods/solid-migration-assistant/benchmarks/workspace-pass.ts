import type { SgRoot } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

/**
 * One workspace-semantic pass for the benchmark: resolve the references of
 * the first imported binding in each file, which makes the bridge consult
 * the workspace index it built for the command, then report nothing. Every
 * marker does identical work; the marker only makes each generated inline
 * definition's bundled artifact distinct, as each YAML step's entrypoint
 * used to be.
 */
export function createWorkspacePass(
  marker: string,
): (root: SgRoot<TSX>) => null {
  if (marker.length === 0) throw new Error("workspace-pass marker is required");

  return (root) => {
    for (const statement of root.root().findAll({
      rule: { kind: "import_statement" },
    })) {
      const specifier = statement.find({ rule: { kind: "import_specifier" } });
      const identifiers = specifier?.findAll({ rule: { kind: "identifier" } });
      const binding = identifiers?.at(-1);
      if (!binding) continue;

      // Force the workspace semantic index while keeping every pass identical.
      binding.references();
      break;
    }

    return null;
  };
}
