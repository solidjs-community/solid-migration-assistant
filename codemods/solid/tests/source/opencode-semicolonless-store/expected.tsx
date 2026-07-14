import { createEffect, createStore, type SetStoreFunction, type Store, deep } from "solid-js";

export function install(setStore: SetStoreFunction<{ ready: boolean }>) {
  const [state] = createStore({ ready: false })
  createEffect(() => deep(state.ready), (ready) => console.log(ready));
  setStore({ ready: true })
}
