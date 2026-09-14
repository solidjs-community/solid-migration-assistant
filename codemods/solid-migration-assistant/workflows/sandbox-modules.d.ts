// Type program of the workflow process (`tsconfig.workflows.json`).
//
// The workflow modules run in Node with `@types/node`, but they import the
// rules, which are typed against the sandbox's `codemod:ast-grep` modules.
// The root entry of `@codemod.com/jssg-types` also declares the sandbox's
// `node:*` shims, which would collide with `@types/node` here, so this file
// pulls in only the ast-grep declarations and the one language module the
// rules import. The sandbox-side program (`tsconfig.json`) keeps the full
// package, shims included, because that is the runtime the rules execute in.

/// <reference types="@codemod.com/jssg-types/main" />

declare module "codemod:ast-grep/langs/tsx" {
  export { default } from "@codemod.com/jssg-types/langs/tsx";
}
