import { For, onCleanup } from "solid-js";

onCleanup(() => release());

export const List = (props: { items: string[] }) => (
  <For each={props.items}>{(item) => <p class="item">{item}</p>}</For>
);
