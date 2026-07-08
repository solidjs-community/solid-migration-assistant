// TODO(solid-2): Review semantic migration sites in this file: splitProps.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
type __Solid2SplitKeys<T extends object> = readonly (keyof T)[];
type __Solid2SplitRest<T extends object, Keys extends keyof T> = Omit<T, Keys>;
const splitProps: {
  <T extends object, K1 extends __Solid2SplitKeys<T>>(props: T, k1: K1): [Pick<T, K1[number]>, __Solid2SplitRest<T, K1[number]>];
  <T extends object, K1 extends __Solid2SplitKeys<T>, K2 extends __Solid2SplitKeys<T>>(props: T, k1: K1, k2: K2): [Pick<T, K1[number]>, Pick<T, K2[number]>, __Solid2SplitRest<T, K1[number] | K2[number]>];
  <T extends object, K1 extends __Solid2SplitKeys<T>, K2 extends __Solid2SplitKeys<T>, K3 extends __Solid2SplitKeys<T>>(props: T, k1: K1, k2: K2, k3: K3): [Pick<T, K1[number]>, Pick<T, K2[number]>, Pick<T, K3[number]>, __Solid2SplitRest<T, K1[number] | K2[number] | K3[number]>];
  <T extends object, K1 extends __Solid2SplitKeys<T>, K2 extends __Solid2SplitKeys<T>, K3 extends __Solid2SplitKeys<T>, K4 extends __Solid2SplitKeys<T>>(props: T, k1: K1, k2: K2, k3: K3, k4: K4): [Pick<T, K1[number]>, Pick<T, K2[number]>, Pick<T, K3[number]>, Pick<T, K4[number]>, __Solid2SplitRest<T, K1[number] | K2[number] | K3[number] | K4[number]>];
  <T extends object, K1 extends __Solid2SplitKeys<T>, K2 extends __Solid2SplitKeys<T>, K3 extends __Solid2SplitKeys<T>, K4 extends __Solid2SplitKeys<T>, K5 extends __Solid2SplitKeys<T>>(props: T, k1: K1, k2: K2, k3: K3, k4: K4, k5: K5): [Pick<T, K1[number]>, Pick<T, K2[number]>, Pick<T, K3[number]>, Pick<T, K4[number]>, Pick<T, K5[number]>, __Solid2SplitRest<T, K1[number] | K2[number] | K3[number] | K4[number] | K5[number]>];
} = ((props: any, ...keyGroups: any[]) => { const picked = new Set<any>(); const groups = keyGroups.map((group: any) => { const out: any = {}; for (const key of group ?? []) { picked.add(key); Object.defineProperty(out, key, { enumerable: true, configurable: true, get: () => props[key] }); } return out; }); const rest = new Proxy({}, { get: (_target, key: any) => picked.has(key) ? undefined : props[key], has: (_target, key: any) => !picked.has(key) && key in props, ownKeys: () => Reflect.ownKeys(props).filter((key: any) => !picked.has(key)), getOwnPropertyDescriptor: (_target, key: any) => picked.has(key) || !(key in props) ? undefined : { enumerable: true, configurable: true } }); return [...groups, rest]; }) as any;


// TODO(solid-2): Review splitProps selected-prop usage; only rest-only cases are mechanically safe.
const [local, events, scriptProps] = splitProps(
  props,
  ["src"],
  ["onLoad", "onError"],
);

console.log(local.src, events.onLoad, scriptProps.id);
