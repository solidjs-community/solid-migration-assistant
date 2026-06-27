// TODO(solid-2): Review semantic migration sites in this file: catchError, createEffect, createRenderEffect, createResource.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const catchError: (fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => any = ((fn: (...args: any[]) => any, handler?: (...args: any[]) => any) => { try { return fn(); } catch (err) { return handler ? handler(err) : undefined; } }) as any;
import { createEffect as __solid2CreateEffect } from "solid-js";
const createEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any, options?: any) => { let previous = value; return __solid2CreateEffect(() => fn(previous), (next: any) => { previous = next; }, options); }) as any;
const createRenderEffect: (fn: (previous?: any) => any, value?: any, options?: any) => any = ((fn: (previous?: any) => any, value?: any) => fn(value)) as any;
import { createEffect as __solid2CreateResourceEffect, createSignal as __solid2CreateResourceSignal } from "solid-js";
const createResource: { (source: any, fetcher: (value: any, info: any) => any, options?: any): any; (fetcher: (...args: any[]) => any, options?: any): any } = ((source: any, fetcher?: any, options?: any) => { const hasSource = typeof fetcher === "function"; const actualSource = hasSource ? source : undefined; const actualFetcher = hasSource ? fetcher : source; const actualOptions = hasSource ? options : fetcher ?? options; let latest = actualOptions?.initialValue; let error: any; const [readLatest, setLatest] = __solid2CreateResourceSignal(latest as any); const resource: any = () => { if (error) throw error; return readLatest(); }; Object.defineProperty(resource, "latest", { get: () => readLatest() }); Object.defineProperty(resource, "error", { get: () => error }); Object.defineProperty(resource, "state", { get: () => error ? "errored" : readLatest() === undefined ? "unresolved" : "ready" }); const mutate = (value: any) => { error = undefined; const next = typeof value === "function" ? value(latest) : value; latest = next; setLatest(() => next); return next; }; const fail = (err: any) => { error = err; return undefined; }; const readSource = () => typeof actualSource === "function" ? actualSource() : actualSource; const run = (input: any) => { if (hasSource && input === undefined) return Promise.resolve(undefined); return Promise.resolve(typeof actualFetcher === "function" ? actualFetcher(input, { value: latest }) : input).then(mutate, fail); }; const refetch = function(value?: any) { const input = arguments.length > 0 ? value : hasSource ? readSource() : undefined; return run(input); }; if (hasSource) __solid2CreateResourceEffect(() => readSource(), (input: any) => { void run(input); }); else void refetch(); return [resource, { mutate, refetch }]; }) as any;


export // TODO(solid-2): Review createResource resource cluster.
const data = createResource(() => "id", async id => id);
export const guarded = catchError(() => data[0](), () => "fallback");
// TODO(solid-2): Review createEffect split.
createEffect((prev = 0) => prev + 1);
// TODO(solid-2): Review createRenderEffect split.
createRenderEffect((prev = 0) => prev + 1);
