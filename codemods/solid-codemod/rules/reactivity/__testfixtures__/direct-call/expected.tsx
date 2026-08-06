import { createEffect } from "solid-js";

createEffect(() => {
  document.title = "supported";
});

createEffect(
  () => "already split",
  value => console.log(value),
);

declare const callbacks: [() => void];
createEffect(...callbacks);

function shadowed(createEffect: (callback: () => void) => void) {
  createEffect(() => console.log("local"));
}

void shadowed;
