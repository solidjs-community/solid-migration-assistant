// TODO(solid-2): Review semantic migration sites in this file: createEffect, createRenderEffect, createRoot.
import * as Solid from "solid-js";
import { createRoot } from "solid-js";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const createEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;
const createRenderEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;


export const value = createRoot(dispose => {
  // TODO(solid-2): Review createEffect split.
createEffect((prev = 0) => prev + 1);
  // TODO(solid-2): Review createRenderEffect split.
createRenderEffect((prev = 0) => prev + 1);
  Solid.createRoot(() => (Solid as any).createEffect(() => 1));
  dispose();
  return 1;
});
