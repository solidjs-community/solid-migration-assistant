import { For } from "solid-js";

export function View() {
  const Index = (props) => <section>{props.children}</section>;
  return <Index each={items()}>{item => <span>{item()}</span>}</Index>;
}
