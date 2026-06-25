import { Loading, For, createSignal } from "solid-js";
import { render } from "@solidjs/web";

function App() {
  const [items] = createSignal([]);
  return <Loading fallback="loading"><For each={items()}>{item => <span>{item}</span>}</For></Loading>;
}

render(() => <App />, document.getElementById("root")!);
