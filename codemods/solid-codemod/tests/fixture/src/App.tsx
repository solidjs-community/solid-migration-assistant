import { createEffect, createSignal } from "solid-js";
import { render } from "solid-js/web";
import "solid-js/web";

const [count, setCount] = createSignal(0);

createEffect(() => {
  const title = `Count ${count()}`;
  document.title = title;
});

createEffect(
  () => count(),
  value => console.log(value),
);

function shadowed(createEffect: (callback: () => void) => void) {
  createEffect(() => console.log("local"));
}

function App() {
  return <button onClick={() => setCount(count() + 1)}>{count()}</button>;
}

void shadowed;
render(() => <App />, document.getElementById("root")!);
