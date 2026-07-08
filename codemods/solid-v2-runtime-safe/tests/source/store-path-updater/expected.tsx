import { createStore } from "solid-js";

const [state, setState] = createStore({ toasts: [] as ToastConfig[] });

setState((state) => {
  state.toasts = ((prev) => [...prev, toast])(state.toasts);
});
