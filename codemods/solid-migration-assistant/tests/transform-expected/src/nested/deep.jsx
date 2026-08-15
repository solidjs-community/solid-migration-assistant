// Nested JSX module with legacy subpath references.
import { createRenderer } from "@solidjs/universal";
import { jsx } from "@solidjs/web/jsx-runtime";

export function App() {
  return <div data-renderer={createRenderer}>nested</div>;
}

const dynamic = import("@solidjs/html");
void dynamic;
void jsx;
