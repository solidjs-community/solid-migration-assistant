import { splitProps } from "solid-js";

export function Anchor(props: { href: string; class?: string; children?: unknown }) {
  const [, rest] = splitProps(props, ["href", "class"]);
  return <a href={props.href} class={props.class} {...rest} />;
}
