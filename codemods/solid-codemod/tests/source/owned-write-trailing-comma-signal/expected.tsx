// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot, createSignal } from "solid-js";

export function createImmutableState() {
  return createRoot(dispose => {
    const [data, setData] = createSignal<{ user?: { firstName: string } }>(
      {},
     { ownedWrite: true });
    setTimeout(() => setData({ user: { firstName: "Ada" } }));
    return { data, dispose };
  });
}
