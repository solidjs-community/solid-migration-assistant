// TODO(solid-2): Review semantic migration sites in this file: Signal.
import { createSignal } from "solid-js";

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
type Signal<T = any> = [() => T, (value: T | ((prev: T) => T)) => unknown];


const counter = createSignal(0) as unknown as Signal<number> & { count: number };
const direct = createSignal("x") as Signal<string>;
