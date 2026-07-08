import { createSignal } from "solid-js";
import type { JSX, ComponentProps as PropsFor } from "@solidjs/web";

type ButtonProps = PropsFor<"button"> & { children: JSX.Element };

export function Button(props: ButtonProps) {
  const [count] = createSignal(0);
  return <button>{props.children}{count()}</button>;
}
