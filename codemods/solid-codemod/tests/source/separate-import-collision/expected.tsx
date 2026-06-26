import { For } from "solid-js";

import { Errored } from "solid-js";


export const view = <>
  <For each={items()} keyed={false}>{item => <span>{item()}</span>}</For>
  <Errored fallback={err => (err() as Error).message}><Child /></Errored>
</>;
