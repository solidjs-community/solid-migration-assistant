import { Suspense as AsyncBoundary, Index as StableList, mergeProps as mergeSolidProps } from "solid-js";
import { Dynamic } from "solid-js/web";

export function View() {
  const props = mergeSolidProps(defaults, overrides);
  return <AsyncBoundary fallback="loading"><StableList each={props.items}>{item => <Dynamic component={item()} />}</StableList></AsyncBoundary>;
}
