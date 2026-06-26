// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createSingletonRoot } from "@solid-primitives/rootless";
import { createRoot, createSignal } from "solid-js";

createRoot(() => {
  const [value, setValue] = createSignal(0, { ownedWrite: true });
  setValue(1);

  const [kept, setKept] = createSignal(0, { equals: false, ownedWrite: true });
  setKept(1);
});

function outsideOwner() {
  const [other, setOther] = createSignal(0);
  setOther(1);
}

export const useGlobal = createSingletonRoot(() => {
  const [event, setEvent] = createSignal<KeyboardEvent | null>(null, { ownedWrite: true });
  window.addEventListener("keydown", event => setEvent(event));
  return event;
});
