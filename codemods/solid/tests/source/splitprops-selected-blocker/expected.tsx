import { splitProps } from "solid-js";

// TODO(solid-2 S2-BLOCKER-PROPS-001): splitProps selected bindings or dynamic key groups require semantic review.
const [local, rest] = splitProps(props, ["href"]);
forwardProps(local);
render(rest);
