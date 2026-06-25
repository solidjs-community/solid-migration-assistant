import { ErrorBoundary } from "solid-js";

export const view = <ErrorBoundary fallback={err => <Fallback error={err} stack={err.stack}>{String(err)}</Fallback>}><Child /></ErrorBoundary>;
