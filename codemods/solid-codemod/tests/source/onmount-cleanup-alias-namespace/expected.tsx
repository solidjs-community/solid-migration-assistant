import { onSettled } from "solid-js";
import * as Solid from "solid-js";

onSettled(() => {
  return () => stop();
});

Solid.onSettled(() => {
  return () => stop();
});
