// TODO(solid-2): Review semantic migration sites in this file: ErrorBoundary fallback.
import { Errored } from "solid-js";

export const view = <Errored fallback={({ message }) => <p>{message}</p>}><Child /></Errored>;
