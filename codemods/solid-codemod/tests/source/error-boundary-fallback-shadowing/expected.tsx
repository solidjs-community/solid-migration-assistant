import { Errored } from "solid-js";

export function View() {
  return <Errored fallback={err => {
    const message = (err() as Error).message;
    {
      const err = getError();
      console.log(err.message);
    }
    try {
      risky();
    } catch (err) {
      console.log(err.name);
    }
    const nested = (err) => err.name;
    return <p>{message}{nested((err() as Error))}</p>;
  }}><Child /></Errored>;
}
