// Nested JSX module with a legacy subpath reference and a classList attribute
// in the same file, so both transform rules must edit it in one pass.
import { createRenderer } from "@solidjs/universal";
import { jsx } from "@solidjs/web/jsx-runtime";

export function App() {
  return (
    <div data-renderer={createRenderer} class={{ nested: true }}>
      nested
    </div>
  );
}

const dynamic = import("@solidjs/html");
void dynamic;
void jsx;
