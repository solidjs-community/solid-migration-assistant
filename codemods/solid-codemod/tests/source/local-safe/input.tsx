import { Suspense, SuspenseList, ErrorBoundary, Index, onMount, mergeProps, unwrap, batch } from "solid-js";
import { render } from "solid-js/web";
import html from "solid-js/html";
import type { JSX, Component, ComponentProps } from "solid-js";
import { createStore, produce } from "solid-js/store";

const Theme = createContext("light");

function App(props) {
  return <>
    <Index each={items()}>{(item, i) => <Row item={item()} index={i} />}</Index>
    <SuspenseList revealOrder="forwards" tail="collapsed"><Suspense fallback={<p />}>x</Suspense></SuspenseList>
    <ErrorBoundary fallback={err => <p>{err.message}</p>}><Child /></ErrorBoundary>
    <Theme.Provider value="dark">{props.children}</Theme.Provider>
    <div class="card" classList={{ active: isActive() }} />
  </>;
}

onMount(() => mount());
const merged = mergeProps(props);
const plain = unwrap(store);
batch(() => setA(1));
