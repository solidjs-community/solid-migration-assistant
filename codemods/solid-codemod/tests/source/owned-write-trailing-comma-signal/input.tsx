import { createRoot, createSignal } from "solid-js";

export function createImmutableState() {
  return createRoot(dispose => {
    const [data, setData] = createSignal<{ user?: { firstName: string } }>(
      {},
    );
    setTimeout(() => setData({ user: { firstName: "Ada" } }));
    return { data, dispose };
  });
}
