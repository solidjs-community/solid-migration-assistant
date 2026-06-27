import { batch } from "solid-js";

export function Example() {
  return <input onInput={() => batch(() => console.log("x"))} />;
}
