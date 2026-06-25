// TODO(solid-2): Review semantic migration sites in this file: createComputed, createResource, on, splitProps.
import { createResource, createEffect, on, createComputed, splitProps } from "solid-js";

const [user] = createResource(id, fetchUser);
createEffect(on(user, value => console.log(value)));
createComputed(() => setValue(user()));
const [local, rest] = splitProps(props, ["class"]);
