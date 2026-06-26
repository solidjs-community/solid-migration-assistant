import { onCleanup } from "solid-js";

type Config = { enabled?: boolean; url?: string };

export function setupEvents({ enabled = true, url }: Config = {}) {
  onCleanup(() => console.log(url));
  return enabled ? url : undefined;
}
