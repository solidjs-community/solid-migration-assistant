import { sharedConfig } from "solid-js";

export function hasHydrationContext() {
  return !!sharedConfig.context && !sharedConfig.context.noHydrate;
}
