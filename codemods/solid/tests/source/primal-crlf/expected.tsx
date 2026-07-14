import { onMount, createStore, storePath } from "solid-js";

const [state, updateState] = createStore({ active: false });

export function activate() {
  // TODO(solid-2 S2-BLOCKER-LIFECYCLE-001): onMount cleanup shape requires control-flow review.
  onMount(() => {
    console.log(state.active);
  });
  updateState(storePath('active', () => true));
}
