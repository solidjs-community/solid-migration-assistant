import { createResource, createSignal } from "solid-js";

const [id, setId] = createSignal("a");
const [data, actions] = createResource(id, async value => value.toUpperCase());
setId("b");
actions.refetch();
