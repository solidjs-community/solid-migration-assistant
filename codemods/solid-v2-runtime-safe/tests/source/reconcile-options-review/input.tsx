import { createStore, type ReconcileOptions, reconcile } from "solid-js/store";

type Options = { reconcile?: ReconcileOptions };

const [state, setState] = createStore({ value: undefined as string | undefined });

export function update(value: string, options: Options) {
  setState("value", reconcile(value, options.reconcile as any));
  return state.value;
}
