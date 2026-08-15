import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";
import { analyzeFrom, analyzeObservable } from "./from-observable.ts";

const MIGRATION_GUIDE = "https://github.com/solidjs/solid/blob/ff4d3c4479163fbdd3327f5b22d0c3ea7bd1a2c5/documentation/solid-2.0/MIGRATION.md#detailed-removal-guide";

const testFromObservableRule: Codemod<TSX> = async (root) => {
  const filename = root.relativeFilename().replaceAll("\\", "/");
  const registrations = [analyzeFrom, analyzeObservable];
  const guidance = registrations.flatMap((analyzer) =>
    analyzer(root.root(), { filename }),
  );

  const isFixture = root.source().includes('from "solid-js"') ||
    root.source().includes('from "solid-js/web"');

  if (isFixture) {
    if (guidance.length === 0) {
      throw new Error("expected from/observable findings but got none");
    }
  }

  if (!isFixture) {
    if (guidance.length > 0) {
      throw new Error(
        `unexpected from/observable findings in non-Solid fixture: ${guidance.join("\n")}`,
      );
    }
  }

  if (guidance.some((entry) => !entry.includes(MIGRATION_GUIDE))) {
    throw new Error("every from/observable finding must link the migration guide");
  }

  if (guidance.some((entry) => !entry.includes("Manual review required"))) {
    throw new Error("every from/observable finding must require manual review");
  }

  return null;
};

export default testFromObservableRule;
