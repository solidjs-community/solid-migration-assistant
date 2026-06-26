// TODO(solid-2): Review semantic migration sites in this file: createResource.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const createResource: { (source: any, fetcher: (value: any, info: any) => any, options?: any): any; (fetcher: (...args: any[]) => any, options?: any): any } = ((source: any, fetcher?: any, options?: any) => { let latest = options?.initialValue; const resource: any = () => latest; Object.defineProperty(resource, "latest", { get: () => latest }); Object.defineProperty(resource, "state", { get: () => latest === undefined ? "unresolved" : "ready" }); const mutate = (value: any) => latest = typeof value === "function" ? value(latest) : value; const refetch = () => { const input = typeof source === "function" ? source() : source; return Promise.resolve(typeof fetcher === "function" ? fetcher(input, { value: latest }) : input).then(mutate); }; void refetch(); return [resource, { mutate, refetch }]; }) as any;


const [user] = createResource(id, fetchUser);
