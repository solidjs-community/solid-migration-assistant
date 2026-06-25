import { SuspenseList } from "solid-js";

export const view = <>
  <SuspenseList revealOrder="backwards" tail="hidden" />
  <SuspenseList revealOrder={order()} />
</>;
