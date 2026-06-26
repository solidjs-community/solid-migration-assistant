import { createStore, reconcile, storePath } from "solid-js";

const [state, setState] = createStore({ data: [] });

setState(storePath("data", reconcile(next) as any));
