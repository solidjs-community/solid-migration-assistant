import { createStore } from "solid-js";

const [state] = createStore({ ready: true });
export const App = () => <main>{state.ready ? "Ready" : "Waiting"}</main>;
