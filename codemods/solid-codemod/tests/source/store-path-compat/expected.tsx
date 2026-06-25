import { createStore, storePath } from "solid-js";

const [store, setStore] = createStore({ user: { address: { city: "" } } });

setStore(storePath("user", "address", "city", city));
