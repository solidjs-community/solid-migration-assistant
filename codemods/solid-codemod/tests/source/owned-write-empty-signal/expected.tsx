// TODO(solid-2): Review semantic migration sites in this file: createRoot.
import { createRoot, createSignal } from "solid-js";

export function createOptionalUrl(fetchMock: () => void) {
  return createRoot(dispose => {
    const [url, setUrl] = createSignal<string>(undefined, { ownedWrite: true });
    fetchMock();
    setTimeout(() => setUrl("/next"));
    return { url, dispose };
  });
}
