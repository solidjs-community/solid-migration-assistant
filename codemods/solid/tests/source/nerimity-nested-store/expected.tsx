import { flush as batch, createStore, storePath } from "solid-js";

type Item = { id: string; remove(): void };

const [state, setState] = createStore<{ items: Record<string, Item> }>({ items: {} });

export function install(item: Item) {
  batch(() => {
    setState(storePath("items", item.id, {
      ...item,
      remove() {
        setState(storePath("items", this.id, { ...this }));
      },
    }));
  });
}
