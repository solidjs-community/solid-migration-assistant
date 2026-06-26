import { createStore, reconcile } from "solid-js/store";

const [state, setState] = createStore({ data: [] });

setState("data", reconcile(next));
