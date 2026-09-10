// Nested JSX module with a legacy subpath reference and a classList attribute
// in the same file, so both transform rules must edit it in one pass.
import { createRenderer } from "solid-js/universal";
import { jsx } from "solid-js/jsx-runtime";

export function App() {
  return (
    <div data-renderer={createRenderer} classList={{ nested: true }}>
      nested
    </div>
  );
}

const dynamic = import("solid-js/html");
void dynamic;
void jsx;
