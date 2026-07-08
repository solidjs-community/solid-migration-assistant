import { createStore } from "solid-js";

const [items, setItems] = createStore<string[]>([]);
const [state, setState] = createStore({ value: 1 });

setItems(() => nextItems);
setItems((prev) => [...prev, extra]);
setState(() => ({ value: 2 }));
setState((state) => {
  state.value = 3;
});

function nested(setItems: (value: string[]) => void) {
  setItems(otherItems);
}
