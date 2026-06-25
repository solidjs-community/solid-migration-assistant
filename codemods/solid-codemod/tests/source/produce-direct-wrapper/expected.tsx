import { createStore } from "solid-js";

const [store, setStore] = createStore({ user: { name: "" } });

setStore(state => {
  state.user.name = name;
});
