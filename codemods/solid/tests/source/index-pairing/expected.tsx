import { For } from "solid-js";

const items = [{ id: "one" }];
const fallback = <p>Empty</p>;

export const view = (
  <For
    each={items}
    fallback={fallback}
    keyed={false}
  >
    {(item, index) => <p data-index={index}>{item().id}</p>}
  </For>
);
