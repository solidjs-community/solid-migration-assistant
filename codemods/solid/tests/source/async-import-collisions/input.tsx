import { createResource, ErrorBoundary, Suspense } from "solid-js";

const createMemo = "occupied";
const Loading = "occupied";
const Errored = "occupied";
const [details] = createResource(source, loadDetails);

export const view = (
  <ErrorBoundary fallback={(error) => <p>{error.message}</p>}>
    <Suspense fallback={<p>Wait</p>}>{details()?.name}</Suspense>
  </ErrorBoundary>
);

console.log(createMemo, Loading, Errored);
