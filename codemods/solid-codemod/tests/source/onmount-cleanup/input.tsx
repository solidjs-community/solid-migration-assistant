import { onMount, onCleanup } from "solid-js";

onMount(() => {
  const id = setInterval(tick, 1000);
  onCleanup(() => clearInterval(id));
});
