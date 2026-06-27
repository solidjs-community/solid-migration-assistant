import { flush } from "solid-js";

export function Example() {
  return <input onInput={() => flush(() => console.log("x"))} />;
}
