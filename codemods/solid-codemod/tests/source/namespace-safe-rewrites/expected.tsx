import * as Solid from "solid-js";

const merged = Solid.merge(defaults, overrides);
const plain = Solid.snapshot(store);
Solid.onSettled(() => ready());

export const view = <>
  <Solid.For each={items()} keyed={false}>{item => <span>{item()}</span>}</Solid.For>
  <Solid.Reveal order="together" collapsed><Solid.Loading fallback="loading">ready</Solid.Loading></Solid.Reveal>
  <Solid.Errored fallback={err => (err() as Error).message}><Child /></Solid.Errored>
</>;
