import { onSettled } from "solid-js";

onSettled(() => {
  const listener = () => refresh();
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("focus", listener);
  };
});
