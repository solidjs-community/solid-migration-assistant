import { Errored } from "solid-js";

export const view = <Errored fallback={err => <Fallback error={(err() as Error)} stack={(err() as Error).stack}>{String((err() as Error))}</Fallback>}><Child /></Errored>;
