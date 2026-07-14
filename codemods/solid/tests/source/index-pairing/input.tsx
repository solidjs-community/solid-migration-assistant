import { Index } from "solid-js";

const items = [{ id: "one" }];
const fallback = <p>Empty</p>;

export const view = (
  <Index
    each={items}
    fallback={fallback}
  >
    {(item, index) => <p data-index={index}>{item().id}</p>}
  </Index>
);
