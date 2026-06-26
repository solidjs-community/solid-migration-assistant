// TODO(solid-2): Review semantic migration sites in this file: on, startTransition.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const on: (deps: any, fn: (input: any, previousInput: any, previous?: any) => any, options?: any) => any = ((deps: any, fn: (input: any, previousInput: any, previous?: any) => any) => (previous?: any) => { const input = typeof deps === "function" ? deps() : Array.isArray(deps) ? deps.map((dep: any) => typeof dep === "function" ? dep() : dep) : deps; return fn(input, undefined, previous); }) as any;
const startTransition: (fn: () => any) => any = ((fn: () => any) => fn()) as any;


const search = () => location.search;
export const queryFn = on(search, () => new URLSearchParams(location.search)) as () => URLSearchParams;
export const version = startTransition(() => 1);
