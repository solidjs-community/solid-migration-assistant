import { on, startTransition } from "solid-js";

const search = () => location.search;
export const queryFn = on(search, () => new URLSearchParams(location.search)) as () => URLSearchParams;
export const version = startTransition(() => 1);
