import { createStore } from "solid-js";

const [store, setStore] = createStore({ user: { address: { city: "" } } });

setStore((state) => {
  state.user.address.city = city;
});
