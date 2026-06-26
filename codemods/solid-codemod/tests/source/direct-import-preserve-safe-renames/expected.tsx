import { onSettled, flush, Loading } from "solid-js";

onSettled(() => {
  return () => dispose();
});

flush(() => setCount(1));

export const view = <Loading fallback="loading">ready</Loading>;
