import { onMount } from 'solid-js';
import { createStore } from 'solid-js/store';

const [state, updateState] = createStore({ active: false });

export function activate() {
  onMount(() => {
    console.log(state.active);
  });
  updateState('active', () => true);
}
