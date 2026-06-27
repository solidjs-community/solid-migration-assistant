import { createStore, reconcile } from "solid-js";

const [state, setState] = createStore({ data: [] });

setState((state) => {
  state.data = reconcile(next) as any;
});
