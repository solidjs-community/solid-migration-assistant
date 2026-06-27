import { JSX, ValidComponent, createSignal, splitProps } from "solid-js";

type BoxProps<T extends ValidComponent = "div"> = { as?: T; style?: JSX.CSSProperties };

export function Box<T extends ValidComponent = "div">(props: BoxProps<T>) {
  const [count] = createSignal(0);
  const [local, others] = splitProps(props, ["as", "style"]);
  return <div style={local.style}>{count()}{others.as}</div>;
}
