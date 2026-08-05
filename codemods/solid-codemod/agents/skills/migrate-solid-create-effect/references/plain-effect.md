# Plain createEffect migration

Solid 2 beta.30 requires separate compute and effect callbacks. This skill covers only a callback with a clear reactive input and one imperative side effect.

## Supported shape

Before:

```ts
createEffect(() => {
  const title = props.title;
  document.title = title;
});
```

After:

```ts
createEffect(
  () => props.title,
  title => {
    document.title = title;
  },
);
```

Keep reactive reads in the compute callback. Pass their result into the effect callback. Keep the imperative operation in the effect callback.

If several reactive values are needed and their relationship is obvious, return a small object or tuple only after confirming that doing so preserves the intended update trigger. Otherwise stop.

## Do not handle

Do not use this example for callbacks with:

- `onCleanup` or returned cleanup work;
- promises, `async`, `await`, or async iteration;
- conditionals, loops, or early returns that control dependency reads;
- `createSignal`, `createMemo`, `createEffect`, owners, or other reactive primitive creation;
- multiple side effects with different input needs;
- writes to signals or stores that the same callback reads;
- calls whose reactive behavior cannot be learned from local code.

Explain why the site is outside this skill and ask for behavior evidence through a focused test or runtime observation.

## Verification

When implementation is requested:

1. Preserve the original timing and update trigger as far as local evidence proves.
2. Run the closest type check and test that exercises the visible side effect.
3. Report the exact site changed, the input chosen for compute, the side effect kept in the second callback, and any behavior not verified.

Target contract: `solid-js@2.0.0-beta.30`, upstream commit `edb3e36faad698d0368d5eade19e4cb3b5d5cf10`.
