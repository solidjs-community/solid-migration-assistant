import { splitProps } from "solid-js";

const [, rest] = splitProps(props, ["class", "style"]);
