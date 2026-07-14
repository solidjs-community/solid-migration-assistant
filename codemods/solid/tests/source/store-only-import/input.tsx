import { createStore } from "solid-js/store";

const [state] = createStore({ ready: true });
export const App = () => <main>{state.ready ? "Ready" : "Waiting"}</main>;
