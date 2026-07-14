import { flush as batch, merge as mergeProps } from "solid-js";

const props = mergeProps({ disabled: false }, incoming);
batch(() => update(props));
