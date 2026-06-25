import { For } from "solid-js";
import { Index } from "solid-js";
import { Errored } from "solid-js";
import { ErrorBoundary } from "solid-js";

export const view = <>
  <Index each={items()}>{item => <span>{item()}</span>}</Index>
  <ErrorBoundary fallback={err => err.message}><Child /></ErrorBoundary>
</>;
