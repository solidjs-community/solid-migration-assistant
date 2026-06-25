import { createSignal, createComputed } from "solid-js";

const [value, setValue] = createSignal(props.initial);

createComputed(() => setValue(props.initial));
