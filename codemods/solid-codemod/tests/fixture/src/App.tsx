import {
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";
import "solid-js/web";

const [count, setCount] = createSignal(0);

createEffect(() => {
  const title = `Count ${count()}`;
  document.title = title;
});

onMount(() => {
  document.querySelector("button")?.focus();
});

createComputed(() => count() * 2);
const props = mergeProps({ label: "Count" }, { label: undefined });
const seeded = createMemo((previous) => previous + count(), 0);

createEffect(
  () => count(),
  value => console.log(value),
);

function shadowed(createEffect: (callback: () => void) => void) {
  createEffect(() => console.log("local"));
}

function App() {
  return <button onClick={() => setCount(count() + 1)}>{props.label} {seeded()}</button>;
}

void shadowed;
render(() => <App />, document.getElementById("root")!);
