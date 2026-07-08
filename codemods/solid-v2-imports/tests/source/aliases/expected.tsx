import { Loading as AsyncBoundary, For as StableList, merge as mergeSolidProps } from "solid-js";
import { Dynamic } from "@solidjs/web";

export function View() {
  const props = mergeSolidProps(defaults, overrides);
  return <AsyncBoundary fallback="loading"><StableList each={props.items} keyed={false}>{item => <Dynamic component={item()} />}</StableList></AsyncBoundary>;
}
