// TODO(solid-2): Review semantic migration sites in this file: splitProps.

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const splitProps: (props: any, ...keyGroups: any[]) => any = ((props: any, ...keyGroups: any[]) => { const picked = new Set<any>(); const groups = keyGroups.map((group: any) => { const out: any = {}; for (const key of group ?? []) { picked.add(key); Object.defineProperty(out, key, { enumerable: true, configurable: true, get: () => props[key] }); } return out; }); const rest = new Proxy({}, { get: (_target, key: any) => picked.has(key) ? undefined : props[key], has: (_target, key: any) => !picked.has(key) && key in props, ownKeys: () => Reflect.ownKeys(props).filter((key: any) => !picked.has(key)), getOwnPropertyDescriptor: (_target, key: any) => picked.has(key) || !(key in props) ? undefined : { enumerable: true, configurable: true } }); return [...groups, rest]; }) as any;


// TODO(solid-2): Review splitProps selected-prop usage; only rest-only cases are mechanically safe.
const [local, events, scriptProps] = splitProps(
  props,
  ["src"],
  ["onLoad", "onError"],
);

console.log(local.src, events.onLoad, scriptProps.id);
