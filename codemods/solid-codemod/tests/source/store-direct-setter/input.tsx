import { createStore } from "solid-js/store";

const [items, setItems] = createStore<string[]>([]);
const [state, setState] = createStore({ value: 1 });

setItems(nextItems);
setItems((prev) => [...prev, extra]);
setState({ value: 2 });
setState("value", 3);

function nested(setItems: (value: string[]) => void) {
  setItems(otherItems);
}
