import { createEffect } from "solid-js";

// TODO(solid-2 S2-EFFECT-001): Split this unsupported one-argument createEffect into compute and apply phases.
createEffect(() => {
  analytics.track(readState());
});
