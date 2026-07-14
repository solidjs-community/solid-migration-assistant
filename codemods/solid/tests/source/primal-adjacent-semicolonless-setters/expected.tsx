import { onMount, createStore, storePath } from "solid-js";

const [store, updateStore] = createStore({
  stats: {},
  exploreTopics: [] as string[],
})

export function refresh(stats: object, topics: string[]) {
  // TODO(solid-2 S2-BLOCKER-LIFECYCLE-001): onMount cleanup shape requires control-flow review.
  onMount(() => {
    updateStore(storePath("stats", () => ({ ...stats })));
    updateStore(storePath("exploreTopics", () => [...topics]))
  })
  return store.exploreTopics
}
