// TODO(solid-2 S2-BLOCKER-DIRECTIVE-001): Directive definition and call sites must migrate together.
export function Button() {
  return <button use:tooltip={"Save"}>Save</button>;
}
