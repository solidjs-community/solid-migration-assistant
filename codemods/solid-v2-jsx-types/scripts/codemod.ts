import type { Codemod } from "codemod:ast-grep";
import type TSX from "codemod:ast-grep/langs/tsx";

// Fresh rewrite starting point: intentionally no-op until this package's migrations are reintroduced.
const codemod: Codemod<TSX> = async () => null;

export default codemod;
