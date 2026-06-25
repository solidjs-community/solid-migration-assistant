import { SuspenseList, Suspense } from "solid-js";

export function Loader() {
  return <SuspenseList revealOrder="together" tail="collapsed"><Suspense fallback="loading">ready</Suspense></SuspenseList>;
}
