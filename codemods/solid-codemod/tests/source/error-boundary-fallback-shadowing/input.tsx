import { ErrorBoundary } from "solid-js";

export function View() {
  return <ErrorBoundary fallback={err => {
    const message = err.message;
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
    return <p>{message}{nested(err)}</p>;
  }}><Child /></ErrorBoundary>;
}
