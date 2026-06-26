import * as Solid from "solid-js";
import { createEffect, createRenderEffect, createRoot } from "solid-js";

export const value = createRoot(dispose => {
  createEffect((prev = 0) => prev + 1);
  createRenderEffect((prev = 0) => prev + 1);
  Solid.createRoot(() => Solid.createEffect(() => 1));
  dispose();
  return 1;
});
