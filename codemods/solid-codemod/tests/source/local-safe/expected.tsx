// TODO(solid-2): Review semantic migration sites in this file: batch, produce.
import { Loading, Reveal, Errored, For, onSettled, merge, snapshot, batch } from "solid-js";
import { render } from "@solidjs/web";
import html from "@solidjs/html";
import type { Component } from "solid-js";
import type { JSX, ComponentProps } from "@solidjs/web";
import { createStore, produce } from "solid-js";

const Theme = createContext("light");

function App(props) {
  return <>
    <For each={items()} keyed={false}>{(item, i) => <Row item={item()} index={i} />}</For>
    <Reveal collapsed><Loading fallback={<p />}>x</Loading></Reveal>
    <Errored fallback={err => <p>{err.message}</p>}><Child /></Errored>
    <Theme value="dark">{props.children}</Theme>
    <div class={["card", { active: isActive() }]} />
  </>;
}

onSettled(() => mount());
const merged = merge(props);
const plain = snapshot(store);
batch(() => setA(1));
