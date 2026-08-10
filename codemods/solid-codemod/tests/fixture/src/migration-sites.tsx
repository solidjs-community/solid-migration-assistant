import {
  createComputed,
  createEffect,
  createMemo,
  createSignal,
  mergeProps,
  onMount,
} from "solid-js";
import { render } from "solid-js/web";

const [count] = createSignal(0);

const props = mergeProps({ label: "Count" }, { label: undefined });
const seeded = createMemo((previous) => previous + count(), 0);

createComputed(() => count() * 2);
createEffect(() => {
  document.title = `Count ${count()}`;
});

onMount(() => {
  document.querySelector("button")?.focus();
});

function Counter() {
  return (
    <button>
      {props.label}: {seeded()}
    </button>
  );
}

render(() => <Counter />, document.getElementById("root")!);
