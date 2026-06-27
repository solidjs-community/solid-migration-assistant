// TODO(solid-2): Review semantic migration sites in this file: createEffect, createRenderEffect, on.
import { createComponent, createMemo } from "solid-js";
import { dynamic } from "@solidjs/web";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
import { createEffect as __solid2CreateEffect } from "solid-js";
import { isServer as __solid2IsServer } from "@solidjs/web";
const createEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any, options?: any) => { if (__solid2IsServer) return undefined as any; let previous = value; return __solid2CreateEffect(() => fn(previous), (next: any) => { previous = next; }, options); }) as any;
const createRenderEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;
const on: (deps: any, fn: (input: any, previousInput: any, previous?: any) => any, options?: any) => any = ((deps: any, fn: (input: any, previousInput: any, previous?: any) => any) => (previous?: any) => { const input = typeof deps === "function" ? deps() : Array.isArray(deps) ? deps.map((dep: any) => typeof dep === "function" ? dep() : dep) : deps; return fn(input, undefined, previous); }) as any;


createComponent(dynamic(source), props);
// TODO(solid-2): Review createEffect split.
createEffect(() => update());
// TODO(solid-2): Review createRenderEffect split.
createRenderEffect(() => update(), seed);
createMemo(() => count(), { equals: false });
// TODO(solid-2): Review createEffect split.
createEffect(on(source, value => update(value)));
