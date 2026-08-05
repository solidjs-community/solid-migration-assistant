# Solid 2 migration analysis

This repository is rebuilding the Solid 1 to Solid 2 migration workflow around read-only detection. The first vertical slice reports exact migration sites and keeps safe source changes behind a separate explicit workflow.

```sh
pnpm analyze --target /path/to/vite-solid-app
pnpm transform:web-imports --target /path/to/vite-solid-app
pnpm verify
```

See [`codemods/solid-codemod/README.md`](codemods/solid-codemod/README.md) for the supported rules, report contract, and deliberate limits.

Historical research reports and supporting repositories remain in place. The current implementation lives only in `codemods/solid-codemod`.
