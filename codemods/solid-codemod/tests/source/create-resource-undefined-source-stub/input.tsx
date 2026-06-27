import { createResource } from "solid-js";

const [id, setId] = createSignal<string | undefined>();
const [data] = createResource(id, async value => value.toUpperCase());
