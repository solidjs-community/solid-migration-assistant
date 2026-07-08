import type { Codemod } from "codemod:ast-grep";
import type JSON from "codemod:ast-grep/langs/json";

// Fresh rewrite starting point: intentionally no-op until JSON/config migrations are reintroduced.
const codemod: Codemod<JSON> = async () => null;

export default codemod;
