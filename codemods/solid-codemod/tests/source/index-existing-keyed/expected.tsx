// TODO(solid-2): Review semantic migration sites in this file: Index keyed.
import { For } from "solid-js";

export function Rows() {
  // TODO(solid-2): Review Index keyed conflict; Index always maps to For keyed={false}.
  return <For each={rows()} keyed={false}>{row => <span>{row().name}</span>}</For>;
}
