import { createEffect } from "solid-js"
import { createStore, type SetStoreFunction, type Store } from "solid-js/store"

export function install(setStore: SetStoreFunction<{ ready: boolean }>) {
  const [state] = createStore({ ready: false })
  createEffect(() => console.log(state.ready))
  setStore({ ready: true })
}
