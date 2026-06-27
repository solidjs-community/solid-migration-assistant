import { createStore } from "solid-js";

const [state, setState] = createStore({ toasts: [] as ToastConfig[] });

setState((state) => {
  const item = state.toasts.find((toast) => toast.id === id);
  if (item) item.dismiss = true;
});
