import { onCleanup, onMount } from "solid-js";

onMount(() => {
  onCleanup(() => releaseA());
  onCleanup(() => releaseB());
});
