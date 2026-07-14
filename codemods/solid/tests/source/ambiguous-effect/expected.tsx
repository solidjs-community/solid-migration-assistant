import { createEffect } from "solid-js";

createEffect(() => readState(), (value) => analytics.track(value));
