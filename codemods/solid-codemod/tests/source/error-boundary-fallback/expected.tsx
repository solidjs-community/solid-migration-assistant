import { Errored } from "solid-js";

export function View() {
  return <>
    <Errored fallback={err => <p>{err().message} {err().name}</p>}><Child /></Errored>
    <Errored fallback={(error, reset) => error().name}><Child /></Errored>
  </>;
}
