# Solid 2 migration codemod

This repository provides read-only Solid 2 migration analysis and a separate workflow that applies every registered safe transform.
The analyzer currently covers exact web imports plus direct `createComputed`, `createEffect`, `createMemo`, `mergeProps`, and `onMount` migration sites in TSX.

```sh
pnpm analyze --target /path/to/vite-solid-app
pnpm transform --target /path/to/vite-solid-app
pnpm verify
```

See [`codemods/solid-codemod/README.md`](codemods/solid-codemod/README.md) for the supported rules, report contract, and deliberate limits.

Historical research reports and supporting repositories remain in place. The current implementation lives only in `codemods/solid-codemod`.
