import { createStore } from "solid-js/store";

const [store, setStore] = createStore({ user: { address: { city: "" } } });

setStore("user", "address", "city", city);
