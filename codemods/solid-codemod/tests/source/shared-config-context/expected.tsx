// TODO(solid-2): Review semantic migration sites in this file: sharedConfig.context.
import { sharedConfig } from "solid-js";

export function hasHydrationContext() {
  return !!(sharedConfig as any).context && !(sharedConfig as any).context.noHydrate;
}
