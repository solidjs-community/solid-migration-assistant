import { createResource, createEffect, on, createComputed, splitProps } from "solid-js";

const [user] = createResource(id, fetchUser);
createEffect(on(user, value => console.log(value)));
createComputed(() => setValue(user()));
const [local, rest] = splitProps(props, ["class"]);
