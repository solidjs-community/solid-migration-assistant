import { createEffect } from "solid-js";

export function Header(props: { title: string; update(value: { title: string; icon: string }): void }) {
  createEffect(() => {
    props.update({
      title: props.title,
      icon: "dashboard",
    });
  });
}
