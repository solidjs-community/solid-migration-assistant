import { createEffect } from "solid-js";

createEffect(() => {
  document.title = "supported";
});

(createEffect)(() => {
  document.title = "parenthesized";
});

createEffect(/* no argument */);
createEffect(/* leading */ () => console.log("leading comment"));
createEffect(() => console.log("trailing comment"), /* trailing */);
(createEffect)(/* parenthesized */ () => console.log("parenthesized comment"));

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
