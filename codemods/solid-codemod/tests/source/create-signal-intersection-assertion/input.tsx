import { createSignal, type Signal } from "solid-js";

const counter = createSignal(0) as Signal<number> & { count: number };
const direct = createSignal("x") as Signal<string>;
