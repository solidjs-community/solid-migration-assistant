import { /* before */ onCleanup /* after */ } from "solid-js";
import { onCleanup as cleanup } from "solid-js";
import * as Solid from "solid-js";
import * as Other from "other-library";

createEffect(() => {
  const id = setInterval(() => console.log("tick"), 1000);
  onCleanup(() => clearInterval(id));
});

// prettier-ignore
(onCleanup /* callee */)(() => {
  document.body.classList.remove("active");
});

onCleanup(/* leading */ () => console.log("leading comment"));
onCleanup(() => console.log("trailing comment") /* trailing */);
// prettier-ignore
(onCleanup)(/* parenthesized */ () => console.log("parenthesized comment"));

cleanup(() => console.log("alias"));
Solid.onCleanup(() => console.log("namespace"));
Other.onCleanup(() => console.log("other package"));

onCleanup();
onCleanup(
  () => console.log("first"),
  () => console.log("second"),
);
declare const callbacks: [() => void];
onCleanup(...callbacks);

const indirect = onCleanup;
indirect(() => console.log("indirect"));

function shadowed(onCleanup: (callback: () => void) => void) {
  onCleanup(() => console.log("local"));
}

void shadowed;
