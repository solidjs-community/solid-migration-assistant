import { onCleanup, onMount } from "solid-js";

// TODO(solid-2 S2-BLOCKER-LIFECYCLE-001): onMount cleanup shape requires control-flow review.
onMount(() => {
  onCleanup(() => releaseA());
  onCleanup(() => releaseB());
});
