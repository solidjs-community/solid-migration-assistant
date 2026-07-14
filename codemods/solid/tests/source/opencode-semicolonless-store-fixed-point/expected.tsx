import { flush as batch, createStore, flush, storePath } from "solid-js";

type State = {
  cards: Array<{ id: string; close(): void }>
  mode: string
  ready: boolean
}

const [store, setStore] = createStore<State>({ cards: [], mode: "light", ready: false })

export function update() {
  batch(() => {
    setStore(storePath("ready", true))
    setStore(storePath("cards", (cards) => cards.splice(0, 1)))
  })
  setStore(() => ({
    cards: [{
      id: "new",
      close() {
        setStore(storePath("ready", false))
      },
    }],
    mode: "dark",
    ready: true,
  }))
  flush(() => setStore(storePath("mode", "system")));
  void Promise.resolve(store.mode)
}
