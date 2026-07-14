import { batch } from "solid-js"
import { createStore, produce } from "solid-js/store"

type State = {
  cards: Array<{ id: string; close(): void }>
  mode: string
  ready: boolean
}

const [store, setStore] = createStore<State>({ cards: [], mode: "light", ready: false })

export function update() {
  batch(() => {
    setStore("ready", true)
    setStore("cards", produce((cards) => cards.splice(0, 1)))
  })
  setStore({
    cards: [{
      id: "new",
      close() {
        setStore("ready", false)
      },
    }],
    mode: "dark",
    ready: true,
  })
  setStore("mode", "system")
  void Promise.resolve(store.mode)
}
