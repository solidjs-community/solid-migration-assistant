import { createResource, createSignal } from "solid-js";

const [url, setUrl] = createSignal<string | undefined>();
const [ready, actions] = createResource(url, async (value, info) => ({ value, refetching: info.refetching }));
ready.error;
ready.loading;
actions.refetch({ reason: "manual" });
setUrl("/api/ready");
