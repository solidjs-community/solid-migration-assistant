import { createRoot, createSignal } from "solid-js";

export function createOptionalUrl(fetchMock: () => void) {
  return createRoot(dispose => {
    const [url, setUrl] = createSignal<string>();
    fetchMock();
    setTimeout(() => setUrl("/next"));
    return { url, dispose };
  });
}
