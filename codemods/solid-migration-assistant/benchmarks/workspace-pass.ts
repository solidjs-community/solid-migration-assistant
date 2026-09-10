import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

export function createWorkspacePass(marker: string): Codemod<TSX> {
  if (marker.length === 0) throw new Error("workspace-pass marker is required");

  return async (root) => {
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

export default createWorkspacePass("packaged-probe");
