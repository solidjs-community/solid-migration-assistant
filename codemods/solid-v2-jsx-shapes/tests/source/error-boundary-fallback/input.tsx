import { ErrorBoundary } from "solid-js";
import { Errored } from "solid-js";

export function View() {
  return <>
    <ErrorBoundary fallback={err => <p>{err.message} {err.name}</p>}><Child /></ErrorBoundary>
    <Errored fallback={(error, reset) => error.name}><Child /></Errored>
  </>;
}
