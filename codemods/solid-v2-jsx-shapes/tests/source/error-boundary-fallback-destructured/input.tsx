import { ErrorBoundary } from "solid-js";

export const view = <ErrorBoundary fallback={({ message }) => <p>{message}</p>}><Child /></ErrorBoundary>;
