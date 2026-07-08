import { Errored } from "solid-js";


export function View() {
  return <>
    <Errored fallback={err => <p>{(err() as Error).message} {(err() as Error).name}</p>}><Child /></Errored>
    <Errored fallback={(error, reset) => (error() as Error).name}><Child /></Errored>
  </>;
}
