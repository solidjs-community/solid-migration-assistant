// TODO(solid-2): Review semantic migration sites in this file: createEffect, createRenderEffect.
import { createComponent, createEffect, createMemo, createRenderEffect } from "solid-js";
import { dynamic } from "@solidjs/web";

createComponent(dynamic(source), props);
// TODO(solid-2): Review createEffect split.
createEffect(() => update());
// TODO(solid-2): Review createRenderEffect split.
createRenderEffect(() => update(), seed);
createMemo(() => count(), { equals: false });
createEffect(
  () => source(),
  value => update(value)
);
