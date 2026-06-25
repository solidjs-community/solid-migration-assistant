import { createStore, produce } from "solid-js/store";

const [store, setStore] = createStore({ user: { name: "" } });

setStore(produce(state => {
  state.user.name = name;
}));
