import { onMount, createStore, flush, storePath } from "solid-js";

const [store, setStore] = createStore({ mode: "light" })

export function install(savedMode: string) {
  // TODO(solid-2 S2-BLOCKER-LIFECYCLE-001): onMount cleanup shape requires control-flow review.
  onMount(() => {
    flush(() => setStore(storePath("mode", savedMode)));
    void Promise.resolve(store.mode)
  })
}
