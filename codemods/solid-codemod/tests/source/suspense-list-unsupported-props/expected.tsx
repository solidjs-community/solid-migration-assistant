// TODO(solid-2): Review semantic migration sites in this file: SuspenseList props.
import { Reveal } from "solid-js";

export const view = <>
  {/* TODO(solid-2): Review unsupported SuspenseList revealOrder/tail values. */}
  <Reveal revealOrder="backwards" tail="hidden" />
  {/* TODO(solid-2): Review dynamic SuspenseList revealOrder. */}
  <Reveal revealOrder={order()} />
</>;
