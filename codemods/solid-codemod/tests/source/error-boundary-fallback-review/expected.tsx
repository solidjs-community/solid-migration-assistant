import { Errored } from "solid-js";

export const view = <Errored fallback={err => <Fallback error={err()} stack={err().stack}>{String(err())}</Fallback>}><Child /></Errored>;
