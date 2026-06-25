import { createSignal } from "solid-js";
import type { Element } from "solid-js";
import type { ComponentProps as PropsFor } from "@solidjs/web";

type ButtonProps = PropsFor<"button"> & { children: Element };

export function Button(props: ButtonProps) {
  const [count] = createSignal(0);
  return <button>{props.children}{count()}</button>;
}
