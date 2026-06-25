import { Index } from "solid-js";

export function Rows() {
  return <Index each={rows()} keyed>{row => <span>{row().name}</span>}</Index>;
}
