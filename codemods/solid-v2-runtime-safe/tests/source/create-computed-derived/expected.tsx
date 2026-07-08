import { createSignal } from "solid-js";

const [value, setValue] = createSignal(() => props.initial);
