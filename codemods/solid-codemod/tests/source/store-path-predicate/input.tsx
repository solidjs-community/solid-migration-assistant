import { createStore } from "solid-js/store";

const [state, setState] = createStore({ toasts: [] as ToastConfig[] });

setState("toasts", (toast) => toast.id === id, "dismiss", true);
