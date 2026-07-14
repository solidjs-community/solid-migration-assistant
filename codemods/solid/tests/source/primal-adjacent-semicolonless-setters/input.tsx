import { onMount } from "solid-js"
import { createStore } from "solid-js/store"

const [store, updateStore] = createStore({
  stats: {},
  exploreTopics: [] as string[],
})

export function refresh(stats: object, topics: string[]) {
  onMount(() => {
    updateStore("stats", () => ({ ...stats }));
    updateStore("exploreTopics", () => [...topics])
  })
  return store.exploreTopics
}
