// TODO(solid-2): Review semantic migration sites in this file: createComputed, createResource, splitProps.
import { createResource, createEffect, createComputed, splitProps } from "solid-js";

// TODO(solid-2): Review createResource resource cluster.
const [user] = createResource(id, fetchUser);
createEffect(
  () => user(),
  value => console.log(value)
);
// TODO(solid-2): Review createComputed write-back pattern.
createComputed(() => setValue(user()));
// TODO(solid-2): Review splitProps selected-prop usage; only rest-only cases are mechanically safe.
const [local, rest] = splitProps(props, ["class"]);
