// TODO(solid-2): Review semantic migration sites in this file: produce.
import { Loading, Reveal, Errored, For, onSettled, merge, snapshot, flush } from "solid-js";
import { render } from "@solidjs/web";
import html from "@solidjs/html";
import type { Component } from "solid-js";
import type { JSX, ComponentProps } from "@solidjs/web";
// TODO(solid-2): Review produce import; direct wrappers can be unwrapped, other uses need store-setter migration.
import { createStore, produce } from "solid-js";

const Theme = createContext("light");

function App(props) {
  return <>
    <For each={items()} keyed={false}>{(item, i) => <Row item={item()} index={i} />}</For>
    <Reveal collapsed><Loading fallback={<p />}>x</Loading></Reveal>
    <Errored fallback={err => <p>{err().message}</p>}><Child /></Errored>
    <Theme.Provider value="dark">{props.children}</Theme.Provider>
    <div class={["card", { active: isActive() }]} />
  </>;
}

onSettled(() => mount());
const merged = merge(props);
const plain = snapshot(store);
flush(() => setA(1));
