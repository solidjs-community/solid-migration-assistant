import { omit } from "solid-js";

export function Anchor(props: { href: string; class?: string; children?: unknown }) {
  const rest = omit(props, "href", "class");
  return <a href={props.href} class={props.class} {...rest} />;
}
