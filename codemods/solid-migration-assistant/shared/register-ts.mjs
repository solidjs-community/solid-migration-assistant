// Module hook for the workflow process: strips types from `.ts`, `.mts`, and
// `.cts` files that live under a `node_modules` directory. Node transforms
// every other TypeScript file itself (the launcher passes
// `--experimental-transform-types`), but refuses files under `node_modules`,
// which is where this package's workflows, rules, and the linked
// `@codemod.com/orchestration` sources sit once the package is installed.
// Node built-ins only.
import { readFileSync } from "node:fs";
import { registerHooks, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";

const TS_IN_NODE_MODULES = /^file:.*\/node_modules\/.*\.[cm]?ts$/u;

registerHooks({
  load(url, context, nextLoad) {
    if (!TS_IN_NODE_MODULES.test(url)) return nextLoad(url, context);
    const source = stripTypeScriptTypes(
      readFileSync(fileURLToPath(url), "utf8"),
      { mode: "transform", sourceUrl: url },
    );
    return {
      format: url.endsWith(".cts") ? "commonjs" : "module",
      source,
      shortCircuit: true,
    };
  },
});
