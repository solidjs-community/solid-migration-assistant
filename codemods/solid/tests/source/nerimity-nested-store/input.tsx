import { batch } from "solid-js";
import { createStore } from "solid-js/store";

type Item = { id: string; remove(): void };

const [state, setState] = createStore<{ items: Record<string, Item> }>({ items: {} });

export function install(item: Item) {
  batch(() => {
    setState("items", item.id, {
      ...item,
      remove() {
        setState("items", this.id, { ...this });
      },
    });
  });
}
