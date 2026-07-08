import { children } from "solid-js";
import type { JSX } from "@solidjs/web";

type State = { value: string };
type Props = { children?: JSX.Element | ((state: State) => JSX.Element) };

export function RenderProp(props: Props) {
  const resolved = children(() => {
    const body = props.children;
    return typeof body === "function" ? body({ value: "ok" }) : body;
  });
  return <>{resolved()}</>;
}
