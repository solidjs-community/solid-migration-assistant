import { onMount } from "solid-js"
import { createStore } from "solid-js/store"

const [store, setStore] = createStore({ mode: "light" })

export function install(savedMode: string) {
  onMount(() => {
    setStore("mode", savedMode)
    void Promise.resolve(store.mode)
  })
}
