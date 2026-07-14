import { onCleanup as cleanup, onMount as mounted } from "solid-js";

mounted(() => {
  const listener = () => refresh();
  window.addEventListener("focus", listener);
  cleanup(() => {
    window.removeEventListener("focus", listener);
  });
});
