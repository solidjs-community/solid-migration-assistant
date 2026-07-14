import { createResource } from "solid-js";
import { createStore } from "solid-js/store";

// TODO(solid-2 S2-EFFECT-001): fixture semantic work item.
export function App() {
  const [state] = createStore({ ready: true });
  createResource(async () => state.ready);
  return <main>{String(state.ready)}</main>;
}
