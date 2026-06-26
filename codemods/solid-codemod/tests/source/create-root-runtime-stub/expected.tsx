// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot } from "solid-js";

export const value = createRoot(dispose => {
  dispose();
  return 1;
});
