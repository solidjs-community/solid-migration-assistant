import { createResource, createSignal, ErrorBoundary, Suspense, useTransition } from "solid-js";

declare function loadDetails(id: string): Promise<{ owner: string }>;

const [selectedId, setSelectedId] = createSignal<string>();
const [pending, startTransition] = useTransition();
const [details] = createResource(selectedId, loadDetails);
const open = (id: string) => startTransition(() => setSelectedId(id));

export const view = (
  <aside aria-busy={details.loading || pending()}>
    <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
      <Suspense fallback={<p>Loading</p>}>
        <p>{details()?.owner}</p>
      </Suspense>
    </ErrorBoundary>
  </aside>
);
