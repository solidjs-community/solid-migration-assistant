// TODO(solid-2): Review semantic migration sites in this file: produce.
import { Loading, Reveal, Errored, For, onSettled, merge, snapshot, flush } from "solid-js";
import { render } from "@solidjs/web";
import html from "@solidjs/html";
import type { Component } from "solid-js";
import type { JSX, ComponentProps } from "@solidjs/web";
// TODO(solid-2): Review produce import; direct wrappers can be unwrapped, other uses need store-setter migration.
import { createStore } from "solid-js";
function __solid2ClassName(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(__solid2ClassName).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => !!enabled)
      .map(([name]) => name)
      .join(" ");
  }
  return "";
}

// TODO(solid-2): Removed Solid 1 imports below are compatibility stubs for type-checking only. Replace each with a Solid 2 migration before relying on runtime behavior.
const produce = undefined as any;


const Theme = createContext("light");

function App(props) {
  return <>
    <For each={items()} keyed={false}>{(item, i) => <Row item={item()} index={i} />}</For>
    <Reveal  collapsed><Loading fallback={<p />}>x</Loading></Reveal>
    <Errored fallback={err => <p>{(err() as Error).message}</p>}><Child /></Errored>
    <Theme.Provider value="dark">{props.children}</Theme.Provider>
    <div class={__solid2ClassName(["card", { active: isActive() }])}  />
  </>;
}

onSettled(() => mount());
const merged = merge(props);
const plain = snapshot(store);
flush(() => setA(1));
