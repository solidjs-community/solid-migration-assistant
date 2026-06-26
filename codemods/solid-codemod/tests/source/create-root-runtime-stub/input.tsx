import { createRoot } from "solid-js";

export const value = createRoot(dispose => {
  dispose();
  return 1;
});
