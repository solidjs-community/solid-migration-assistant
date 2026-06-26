// TODO(solid-2): Review semantic migration sites in this file: ReconcileOptions.
import { createStore, reconcile, storePath } from "solid-js";
// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
type ReconcileOptions<T = any, U = any, V = any> = any & { __solid2Compat?: [T, U, V] };

type Options = { reconcile?: ReconcileOptions };

const [state, setState] = createStore({ value: undefined as string | undefined });

export function update(value: string, options: Options) {
  setState(storePath("value", reconcile(value, options.reconcile as any) as any));
  return state.value;
}
