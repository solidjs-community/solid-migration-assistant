import * as Solid from "solid-js";

const merged = Solid.mergeProps(defaults, overrides);
const plain = Solid.unwrap(store);
Solid.onMount(() => ready());

export const view = <>
  <Solid.Index each={items()}>{item => <span>{item()}</span>}</Solid.Index>
  <Solid.SuspenseList revealOrder="together" tail="collapsed"><Solid.Suspense fallback="loading">ready</Solid.Suspense></Solid.SuspenseList>
  <Solid.ErrorBoundary fallback={err => err.message}><Child /></Solid.ErrorBoundary>
</>;
