// Nested JSX module with legacy subpath references.
import { createRenderer } from "solid-js/universal";
import { jsx } from "solid-js/jsx-runtime";

export function App() {
  return <div data-renderer={createRenderer}>nested</div>;
}

const dynamic = import("solid-js/html");
void dynamic;
void jsx;
