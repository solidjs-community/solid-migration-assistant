// TODO(solid-2): Review semantic migration sites in this file: createEffect.
import { createMemo } from "solid-js";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
import { createEffect as __solid2CreateEffect } from "solid-js";
import { isServer as __solid2IsServer } from "@solidjs/web";
const createEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any, options?: any) => { if (__solid2IsServer) return undefined as any; let previous = value; return __solid2CreateEffect(() => fn(previous), (next: any) => { previous = next; }, options); }) as any;


// TODO(solid-2): Review createEffect split.
createEffect(() => console.log("effect"));
const value = createMemo(() => count());
