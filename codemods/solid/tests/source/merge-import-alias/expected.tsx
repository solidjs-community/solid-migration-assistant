import { merge as withDefaults } from "solid-js";

const merge = "occupied";
const props = withDefaults({ disabled: false }, incoming);
console.log(merge, props);
