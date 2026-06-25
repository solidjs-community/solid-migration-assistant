import { onMount, onCleanup as cleanup } from "solid-js";
import * as Solid from "solid-js";

onMount(() => {
  cleanup(() => stop());
});

Solid.onMount(() => {
  Solid.onCleanup(() => stop());
});
