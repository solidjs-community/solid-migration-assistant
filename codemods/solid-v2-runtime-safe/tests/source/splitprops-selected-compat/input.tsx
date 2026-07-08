import { splitProps } from "solid-js";

const [local, events, scriptProps] = splitProps(
  props,
  ["src"],
  ["onLoad", "onError"],
);

console.log(local.src, events.onLoad, scriptProps.id);
