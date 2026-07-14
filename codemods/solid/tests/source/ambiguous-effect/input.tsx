import { createEffect } from "solid-js";

createEffect(() => {
  analytics.track(readState());
});
