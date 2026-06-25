import { onSettled } from "solid-js";

onSettled(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
});
