import { createSignal, type JSX, type ComponentProps as PropsFor } from "solid-js";

type ButtonProps = PropsFor<"button"> & { children: JSX.Element };

export function Button(props: ButtonProps) {
  const [count] = createSignal(0);
  return <button>{props.children}{count()}</button>;
}
