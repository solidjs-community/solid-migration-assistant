import { mergeProps } from "solid-js";

const merge = (left: unknown, right: unknown) => ({ left, right });
const props = mergeProps({ role: "button" }, incoming);

function nested(mergeProps: (value: string) => string) {
  return mergeProps("local binding");
}

console.log(merge, props, nested);
