// TODO(solid-2): Review semantic migration sites in this file: createComputed, createEffect, createResource, on, splitProps.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const createResource: { (source: any, fetcher: (value: any, info: any) => any, options?: any): any; (fetcher: (...args: any[]) => any, options?: any): any } = ((source: any, fetcher?: any, options?: any) => { let latest = options?.initialValue; let error: any; const resource: any = () => { if (error) throw error; return latest; }; Object.defineProperty(resource, "latest", { get: () => latest }); Object.defineProperty(resource, "error", { get: () => error }); Object.defineProperty(resource, "state", { get: () => error ? "errored" : latest === undefined ? "unresolved" : "ready" }); const mutate = (value: any) => { error = undefined; latest = typeof value === "function" ? value(latest) : value; return latest; }; const fail = (err: any) => { error = err; return undefined; }; const refetch = () => { const input = typeof source === "function" ? source() : source; if (input === undefined) return Promise.resolve(undefined); return Promise.resolve(typeof fetcher === "function" ? fetcher(input, { value: latest }) : input).then(mutate, fail); }; void refetch(); return [resource, { mutate, refetch }]; }) as any;
import { createEffect as __solid2CreateEffect } from "solid-js";
const createEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any, options?: any) => { let previous = value; return __solid2CreateEffect(() => fn(previous), (next: any) => { previous = next; }, options); }) as any;
const on: (deps: any, fn: (input: any, previousInput: any, previous?: any) => any, options?: any) => any = ((deps: any, fn: (input: any, previousInput: any, previous?: any) => any) => (previous?: any) => { const input = typeof deps === "function" ? deps() : Array.isArray(deps) ? deps.map((dep: any) => typeof dep === "function" ? dep() : dep) : deps; return fn(input, undefined, previous); }) as any;
const createComputed: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;
const splitProps: (props: any, ...keys: any[]) => any = undefined as any;


// TODO(solid-2): Review createResource resource cluster.
const [user] = createResource(id, fetchUser);
// TODO(solid-2): Review createEffect split.
createEffect(on(user, value => console.log(value)));
// TODO(solid-2): Review createComputed write-back pattern.
createComputed(() => setValue(user()));
// TODO(solid-2): Review splitProps selected-prop usage; only rest-only cases are mechanically safe.
const [local, rest] = splitProps(props, ["class"]);
