import { onMount, onCleanup, batch, Suspense } from "solid-js";

onMount(() => {
  onCleanup(() => dispose());
});

batch(() => setCount(1));

export const view = <Suspense fallback="loading">ready</Suspense>;
