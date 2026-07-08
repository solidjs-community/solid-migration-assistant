import { mergeProps } from "solid-js";

const merged = mergeProps(defaults, overrides);

function Row(mergeProps) {
  const local = mergeProps;
  return mergeProps({ local: true });
}

function Column() {
  const mergeProps = (value) => value;
  return mergeProps({ local: true });
}
