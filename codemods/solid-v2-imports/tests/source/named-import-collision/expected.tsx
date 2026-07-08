import { For } from "solid-js";

export const view = <For each={items()} keyed={false}>{item => <span>{item()}</span>}</For>;
